/*
 * npm run import:tabiturient [-- np|dod|vuzege|all]
 *
 * Забирает открытые данные с tabiturient.ru и складывает их в data/import/*.json с указанием источника:
 *   np     — перечень направлений (https://tabiturient.ru/np/): код, название, описание, ЕГЭ;
 *   dod    — дни открытых дверей (https://tabiturient.ru/dod/): дата, время, вуз, формат, ссылка;
 *   vuzege — проходные баллы (https://tabiturient.ru/vuzege/): вуз, направление, год, бюджет/платно, балл.
 *
 * Между запросами пауза 1,5–3 с, чтобы не нагружать сайт. Разметка сайта может меняться —
 * разбор сделан по тексту страниц и ссылкам, всё, что не удалось распознать, пропускается (ничего не выдумываем).
 * После импорта: python3 scripts/gen-catalog.py && npm run setup — описания с сайта заменят автоматические.
 *
 * Из песочницы, где делался прототип, сайт был недоступен (сетевые правила), поэтому data/import/ пуст.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://tabiturient.ru";
const OUT = path.resolve(process.cwd(), "data", "import");
const UA = "TrajectoryBot/0.2 (учебный прототип; контакт — см. README)";
const today = new Date().toISOString().slice(0, 10);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pause = () => sleep(1500 + Math.random() * 1500);

async function get(url: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
      if (res.ok) return await res.text();
      console.warn(`  ${res.status} ${url}`);
      if (res.status === 404) return null;
    } catch (e) {
      console.warn(`  сеть: ${url} — ${(e as Error).message}`);
    }
    await sleep(3000 * (i + 1));
  }
  return null;
}

const strip = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, "\"").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

const links = (html: string, re: RegExp) => [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => re.test(h)))]
  .map((h) => (h.startsWith("http") ? h : BASE + (h.startsWith("/") ? "" : "/") + h));

function save(name: string, items: unknown[], source: string) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, JSON.stringify({ source, checkedAt: today, count: items.length, items }, null, 1) + "\n");
  console.log(`✓ ${path.relative(process.cwd(), file)}: ${items.length}`);
}

const SUBJECTS: [RegExp, string][] = [
  [/русск/i, "rus"], [/профильн\w* математ|математ/i, "math"], [/обществозн/i, "soc"], [/информатик/i, "inf"],
  [/иностранн/i, "foreign"], [/биолог/i, "bio"], [/хими/i, "chem"], [/физик(?!ческ)/i, "phys"], [/географ/i, "geo"],
  [/литератур/i, "lit"], [/истори/i, "hist"],
];

async function importNp() {
  const index = await get(`${BASE}/np/`);
  if (!index) return console.error("✗ не удалось открыть /np/");
  const pages = links(index, /\/np\/[^"#?]+/).slice(0, 400);
  console.log(`np: найдено ссылок ${pages.length}`);
  const items: unknown[] = [];
  for (const url of pages) {
    await pause();
    const html = await get(url);
    if (!html) continue;
    const text = strip(html);
    const code = text.match(/\b(\d{2}\.\d{2}\.\d{2})\b/)?.[1];
    if (!code) continue;
    const name = strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(code, "").trim();
    const descMatch = text.match(/(?:Описание|О направлении|Чему учат)[:\s]*([\s\S]{80,900}?)(?:\n[А-ЯЁ][^\n]{0,40}:|\n\n|$)/);
    const egeBlock = text.match(/(?:ЕГЭ|Вступительные испытания)[\s\S]{0,400}/)?.[0] ?? "";
    const ege = SUBJECTS.filter(([re]) => re.test(egeBlock)).map(([, id]) => id);
    items.push({ code, name, description: descMatch?.[1]?.trim() ?? null, ege, url });
    console.log(`  ${code} ${name}`);
  }
  save("tabiturient-np.json", items, `${BASE}/np/`);
}

const MONTHS: Record<string, number> = { янв: 1, фев: 2, мар: 3, апр: 4, мая: 5, май: 5, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12 };

async function importDod() {
  const html = await get(`${BASE}/dod/`);
  if (!html) return console.error("✗ не удалось открыть /dod/");
  const text = strip(html);
  const items: unknown[] = [];
  // Строки вида «12 ноября 2026, 12:00 — День открытых дверей … (онлайн)»
  const re = /(\d{1,2})\s+(янв\w*|фев\w*|мар\w*|апр\w*|мая|май|июн\w*|июл\w*|авг\w*|сен\w*|окт\w*|ноя\w*|дек\w*)\s*(\d{4})?[,\s]*(?:в\s*)?(\d{1,2}:\d{2})?\s*[—–-]?\s*([^\n]{10,200})/gi;
  for (const m of text.matchAll(re)) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const year = Number(m[3] ?? new Date().getFullYear());
    const date = `${year}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
    const title = m[5].trim();
    items.push({ date, time: m[4] ?? null, title, format: /онлайн/i.test(title) ? "online" : "offline", url: `${BASE}/dod/` });
  }
  save("tabiturient-dod.json", items.filter((x) => (x as { date: string }).date >= today), `${BASE}/dod/`);
}

async function importVuzege() {
  const index = await get(`${BASE}/vuzege/`);
  if (!index) return console.error("✗ не удалось открыть /vuzege/");
  const pages = links(index, /\/vuzege\/[^"#?]+/).slice(0, 120);
  const items: unknown[] = [];
  for (const url of pages) {
    await pause();
    const html = await get(url);
    if (!html) continue;
    const text = strip(html);
    const uni = strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
    // «09.03.04 Программная инженерия … бюджет 2026: 287»
    for (const m of text.matchAll(/(\d{2}\.\d{2}\.\d{2})[^\n]{0,120}?(бюджет|платн\w*)[^\n\d]{0,20}(20\d{2})?[^\n\d]{0,10}(\d{2,3})/gi)) {
      const total = Number(m[4]);
      if (total < 100 || total > 500) continue;
      items.push({ university: uni, code: m[1], basis: /бюджет/i.test(m[2]) ? "budget" : "paid", year: Number(m[3] ?? 0) || null, total, url });
    }
  }
  save("tabiturient-vuzege.json", items, `${BASE}/vuzege/`);
}

const mode = process.argv[2] ?? "all";
(async () => {
  if (mode === "np" || mode === "all") await importNp();
  if (mode === "dod" || mode === "all") await importDod();
  if (mode === "vuzege" || mode === "all") await importVuzege();
})();
