/*
 * npm run import:tabiturient [-- vuz|np|dod|all]
 *
 * Забирает открытые данные tabiturient.ru — все вузы и все направления России — в data/import/*.json
 * с источником и датой проверки:
 *   vuz — все вузы и филиалы (регион, форма собственности, головной/филиал) + страница «о вузе»:
 *         официальный сайт, число бюджетных мест, перечень направлений → tabiturient-vuz.json
 *   np  — все направления бакалавриата и специалитета: бюджетные места по РФ, число вузов, наборы ЕГЭ, средний балл,
 *         и все программы всех вузов по направлению с профилем, экзаменами и проходными баллами → tabiturient-np.json
 *   dod — дни открытых дверей по всем регионам со ссылкой на официальный анонс → tabiturient-dod.json
 *
 * Не больше 3 запросов одновременно, пауза между запросами. Нераспознанное пропускается — ничего не придумываем.
 * Дальше: npm run gen:catalog && npm run setup.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://tabiturient.ru";
const OUT = path.resolve(process.cwd(), "data", "import");
const UA = "Mozilla/5.0 (compatible; TrajectoryBot/0.3; student prototype)";
const today = new Date().toISOString().slice(0, 10);
const CONCURRENCY = 3;
/** Для пробного запуска: LIMIT=5 npm run import:tabiturient -- np */
const LIMIT = Number(process.env.LIMIT) || Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, init: RequestInit = {}, tries = 3): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { "user-agent": UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(120_000) });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
      console.warn(`  ${res.status} ${url}`);
    } catch (e) {
      console.warn(`  сеть: ${url} — ${(e as Error).message}`);
    }
    await sleep(2000 * (i + 1));
  }
  return null;
}

const post = (url: string, form: Record<string, string>) =>
  get(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form).toString() });

/** Очередь: не больше CONCURRENCY запросов, пауза между запросами одного потока. */
async function pool<T, R>(all: T[], fn: (x: T) => Promise<R>, label: string): Promise<R[]> {
  const items = all.slice(0, LIMIT);
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
      if (i % 50 === 0) console.log(`  ${label}: ${i + 1}/${items.length}`);
      await sleep(300 + Math.random() * 400);
    }
  }));
  return out;
}

function save(name: string, data: Record<string, unknown>) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify({ source: BASE, checkedAt: today, ...data }) + "\n");
  console.log(`✓ data/import/${name}`);
}

const text = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, "\"").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();

/* ───────── vuz ───────── */

async function importVuz() {
  const all = await post(`${BASE}/ajax/ajvuz1.php`, { vuz: "", limit: "5000", page1: "", page2: "" });
  if (!all) return console.error("✗ не удалось получить список вузов");
  const cards = all.split('<div class="mobpadd20" id="vuz').slice(1).map((c) => ({
    tabId: c.match(/^(\d+)/)?.[1] ?? "",
    logo: c.match(/logovuz\/([a-z0-9_]+)\.png/)?.[1] ?? null,
    short: text(c.match(/<span class="font3"><b>([^<]+)<\/b>/)?.[1] ?? ""),
    name: text(c.match(/<\/br>\s*<span class="font2">([^<]+)<\/span>/)?.[1] ?? ""),
    meta: text(c.match(/<span class="font0"[^>]*>([^<]+)<\/span>/)?.[1] ?? ""),
  })).map((c) => {
    const [region, ownership, kind] = c.meta.split("|").map((x) => x.trim());
    return { tabId: c.tabId, logo: c.logo, short: c.short, name: c.name, region, ownership, branch: kind === "Филиал" };
  });
  console.log(`vuz: ${cards.length} вузов и филиалов`);

  // адреса страниц вузов — из карты сайта; связываем с карточкой по заголовку «КОРОТКО | ПОЛНО»
  const map = await get(`${BASE}/map/sitemap.php`, {}, 2);
  const slugs = map ? [...new Set([...map.matchAll(/tabiturient\.ru\/vuzu\/([^/<?]+)\/about/g)].map((m) => decodeURIComponent(m[1])))] : [];
  const pages = (await pool(slugs, async (slug) => {
    const html = await get(`${BASE}/vuzu/${encodeURIComponent(slug)}/about/`);
    if (!html) return null;
    const title = html.match(/<title>([^<]+)/)?.[1]?.trim() ?? "";
    const [short, ...rest] = title.split("|").map((x) => x.trim());
    const t = text(html);
    const site = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
      .find((u) => !/tabiturient|vk\.com|t\.me|oauth|yandex|google|ok\.ru|telegram/.test(u)) ?? null;
    const programs = [...t.matchAll(/(\d{2}\.\d{2}\.\d{2}) \| (Бакалавриат|Специалитет) ([^0-9]+?)(?= \d{2}\.\d{2}\.\d{2} \||[А-ЯЁ ,-]{6,} Укрупненная| Структура вуза|$)/g)]
      .map((m) => ({ code: m[1], level: m[2] === "Бакалавриат" ? "bachelor" : "specialist", name: m[3].replace(/[А-ЯЁ]{3,}[А-ЯЁ ,-]*$/, "").trim() }));
    return {
      slug, short, name: rest.join(" ").trim() || short, site,
      budgetPlaces: Number(t.match(/(\d+) бюджетных мест/)?.[1] ?? NaN) || null,
      avgPass: Number(t.match(/([\d.]+) средневзвешенный проходной балл/)?.[1] ?? NaN) || null,
      programs,
    };
  }, "о вузе")).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const key = (s: string, n: string) => `${s.toLowerCase()}|${n.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ")}`;
  const bySn = new Map(pages.map((p) => [key(p.short, p.name), p]));
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const items = cards.map((c) => {
    const p = bySn.get(key(c.short, c.name)) ?? (c.logo ? bySlug.get(c.logo) : undefined);
    return { ...c, slug: p?.slug ?? null, site: p?.site ?? null, budgetPlaces: p?.budgetPlaces ?? null, avgPass: p?.avgPass ?? null, programs: p?.programs ?? [] };
  });
  console.log(`vuz: со страницей «о вузе» — ${items.filter((x) => x.slug).length}`);
  save("tabiturient-vuz.json", { count: items.length, items });
}

/* ───────── np ───────── */

type Card = { short: string; name: string; profile: string; division: string; exams: string[]; scores: { total: number; form: string; basis: string; year: number }[] };

function parseProgramCards(html: string, code: string): Card[] {
  const cards: Card[] = [];
  for (const chunk of html.split('class="newcard').slice(1)) {
    if (!chunk.includes(`| ${code}`)) continue;
    const vuz = chunk.match(/<b>Вуз:<\/b><\/span>\s*<span class="font2">([^<|]+)\|?<\/span>\s*<span[^>]*>([^<]+)</);
    cards.push({
      short: text(vuz?.[1] ?? ""), name: text(vuz?.[2] ?? ""),
      profile: text(chunk.match(/<b>Профиль:<\/b>([^<]*)/)?.[1] ?? ""),
      division: text(chunk.match(/<b>Подразделение:<\/b>([^<]*)/)?.[1] ?? ""),
      exams: [...chunk.matchAll(/<center>([^<]*?):<br><b>([^<]+)<\/b><\/center>/g)].map((m) => `${m[1].trim()}: ${m[2].trim()}`),
      scores: [...chunk.matchAll(/<b>(\d{2,3})<\/b><\/span>\s*<center><span class="font0">([^<]+)<\/span>[\s\S]*?<b>Проходной балл<\/b> на (\S+) на ([^<]*?) форму обучения в (\d{4}) году/g)]
        .map((m) => ({ total: Number(m[1]), form: m[2].trim(), basis: m[3].startsWith("бюджет") ? "budget" : "paid", year: Number(m[5]) })),
    });
  }
  return cards;
}

async function importNp() {
  const html = await get(`${BASE}/np/`);
  if (!html) return console.error("✗ не удалось открыть /np/");
  const list = [...html.matchAll(/showmoreinfof5\('https:\/\/tabiturient\.ru','(\d+)'\)[\s\S]*?<b>([^<]+)<\/b>[\s\S]*?class="font2">([А-Яа-я]+)\s*\|\s*(\d{2}\.\d{2}\.\d{2})/g)]
    .map((m) => ({ npId: m[1], name: text(m[2]), level: m[3].trim(), code: m[4] }))
    .filter((x) => x.level === "Бакалавриат" || x.level === "Специалитет");
  console.log(`np: ${list.length} направлений бакалавриата и специалитета`);
  const items = await pool(list, async (x) => {
    const info = await post(`${BASE}/ajax/ajshowmoreinfof5.php`, { id: x.npId });
    const t = info ? text(info) : "";
    const num = (re: RegExp) => { const v = t.match(re)?.[1]; return v ? Number(v) : null; };
    const avg = t.match(/Средний проходной балл (\d{4}):\s*([\d.]+)/);
    const examSets = [...t.matchAll(/\d+ ((?:Русский язык|[А-ЯЁ][А-Яа-яё .]+)(?: \+ [А-ЯЁ][А-Яа-яё .]+)+) (\d+) (\d+)/g)]
      .map((m) => ({ exams: m[1].trim(), programs: Number(m[2]), places: Number(m[3]) }));
    const page = await get(`${BASE}/np/${x.npId}/`);
    return {
      ...x, url: `${BASE}/np/${x.npId}`,
      budgetRF: num(/Бюджетных мест в РФ:\s*(\d+)/), universities: num(/Количество вузов с этим направлением:\s*(\d+)/),
      programsRF: num(/Количество образовательных программ:\s*(\d+)/),
      avgPass: avg ? { year: Number(avg[1]), perSubject: Number(avg[2]) } : null,
      examSets,
      programs: page ? parseProgramCards(page, x.code) : null,
    };
  }, "np");
  save("tabiturient-np.json", { count: items.length, items });
}

/* ───────── dod ───────── */

const MONTHS: Record<string, number> = { января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6, июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12 };

async function resolveLink(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
    const loc = res.headers.get("location");
    if (loc && /^https?:\/\//.test(loc)) return loc;
    const body = await res.text();
    return body.match(/(?:location\.href\s*=|location\.replace\(|url=)\s*['"]?(https?:\/\/[^'"\s>]+)/i)?.[1] ?? url;
  } catch {
    return url;
  }
}

async function importDod() {
  const map = await get(`${BASE}/map/sitemap.php`, {}, 2);
  const cities = map ? [...new Set([...map.matchAll(/<loc>(https:\/\/tabiturient\.ru\/dod\/[^<]+)<\/loc>/g)].map((m) => m[1]))] : [];
  console.log(`dod: ${cities.length} страниц регионов`);
  const now = new Date();
  const events = (await pool(cities, async (url) => {
    const html = await get(url.endsWith("/") ? url : `${url}/`);
    if (!html) return [];
    const out = [];
    for (const block of html.split('<table class="dodlist').slice(1)) {
      const d = block.match(/<b>(\d{1,2})\s+([а-я]+)\s*<\/b><\/span>\s*<span class="font2">в (\d{1,2}:\d{2})/);
      const link = block.match(/href="(https:\/\/tabiturient\.ru\/relink\.php\?dod-\d+)"/)?.[1];
      if (!d || !MONTHS[d[2]] || !link) continue;
      // строки карточки: дата, «в 16:00», вуз, название события, место
      const lines = block.split("Подробнее")[0].split(/<[^>]+>/).map((x) => text(x)).filter(Boolean);
      const rest = lines.filter((x) => !/^\d{1,2}\s+[а-я]+$/.test(x) && !/^в \d{1,2}:\d{2}$/.test(x) && !/^"/.test(x) && !/cellpadding|class=/.test(x));
      const month = MONTHS[d[2]];
      // года на странице нет: если месяц уже прошёл — это следующий год
      const year = month < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
      const date = `${year}-${String(month).padStart(2, "0")}-${d[1].padStart(2, "0")}`;
      if (date < today) continue;
      out.push({ id: link.split("dod-")[1], date, time: d[3] === "00:00" ? null : d[3], uniShort: rest[0] ?? "", title: rest[1] ?? "", place: rest[2] ?? "", tabiturientUrl: link, cityPage: url });
    }
    return out;
  }, "dod")).flat();
  const uniq = [...new Map(events.map((e) => [e.id, e])).values()];
  console.log(`dod: ${uniq.length} будущих событий, раскрываем ссылки на официальные анонсы…`);
  const items = await pool(uniq, async (e) => ({ ...e, url: await resolveLink(e.tabiturientUrl) }), "ссылки");
  save("tabiturient-dod.json", { count: items.length, items });
}

const mode = process.argv[2] ?? "all";
(async () => {
  if (mode === "vuz" || mode === "all") await importVuz();
  if (mode === "np" || mode === "all") await importNp();
  if (mode === "dod" || mode === "all") await importDod();
})();
