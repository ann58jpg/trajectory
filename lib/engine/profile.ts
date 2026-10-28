import type { EgeSubject, Klimov, Region, StudentProfile } from "@/lib/schemas";
import { genitiveCity, prepositionalCity } from "./ru";
import { PORTRAIT } from "@/lib/copy";
import { DREAM_FEARS, DREAM_KEYWORDS, DREAM_VALUES, HOBBIES, LIKE_WEIGHT, TASK_PAIRS } from "./vocab";

export type TagSignal = { weight: number; sources: string[] };

export type UserModel = {
  tags: Map<string, TagSignal>;
  klimov: Record<Klimov, number> | null;
  style: { hands: number; head: number; team: number; solo: number };
  formats: Set<string>;
  subjectWeights: Map<string, { weight: number; reasonLabel: string }>;
  ege: Map<string, number | null>;
  egeChosen: boolean;
  region: Region | null;
  city: string | null;
  cityCoef: number;
  completeness: number;
  missing: string[];
  values: string[];
  fears: string[];
};

const REASON_TEXT: Record<string, string> = {
  intrinsic: "интересно само по себе",
  olympiad: "олимпиадный уровень",
  easy: "даётся легко",
  hard_ok: "сложно, но получается",
  useful: "пригодится",
  teacher: "нравится из-за учителя",
  grades_no_like: "оценки хорошие, но не нравится",
};

function addTag(m: Map<string, TagSignal>, tag: string, w: number, source: string) {
  const cur = m.get(tag);
  if (!cur) m.set(tag, { weight: Math.min(1, w), sources: [source] });
  else {
    // максимум + небольшое накопление за независимые подтверждения
    const weight = Math.min(1, Math.max(cur.weight, w) + 0.12 * Math.min(w, cur.weight));
    m.set(tag, { weight, sources: cur.sources.includes(source) ? cur.sources : [...cur.sources, source] });
  }
}

export function parseDreamKeywords(text: string): { tags: string[]; values: string[]; fears: string[] } {
  const tags = new Set<string>();
  for (const [re, ts] of DREAM_KEYWORDS) if (re.test(text)) ts.forEach((t) => tags.add(t));
  const values = DREAM_VALUES.filter(([re]) => re.test(text)).map(([, v]) => v);
  const fears = DREAM_FEARS.filter(([re]) => re.test(text)).map(([, v]) => v);
  return { tags: [...tags], values, fears };
}

export function buildUserModel(p: StudentProfile, egeSubjects: EgeSubject[], regions: Region[]): UserModel {
  const tags = new Map<string, TagSignal>();
  const subj = new Map(egeSubjects.map((s) => [s.id, s]));
  const klimovRaw: Record<Klimov, number> = { P: 0, T: 0, S: 0, A: 0, N: 0 };
  let klimovSignals = 0;

  // Предметы: вес из «почему нравится» (вопрос 12)
  const subjectWeights = new Map<string, { weight: number; reasonLabel: string }>();
  const subjectIds = new Set([...p.ege.map((e) => e.subject), ...Object.keys(p.subjectLikes)]);
  for (const id of subjectIds) {
    const s = subj.get(id);
    if (!s) continue;
    const reasons = p.subjectLikes[id] ?? [];
    let w = reasons.length ? Math.max(...reasons.map((r) => LIKE_WEIGHT[r])) : id === "rus" ? 0.25 : 0.45;
    if (reasons.includes("olympiad")) w = Math.min(1, w + 0.1);
    const best = reasons.slice().sort((a, b) => LIKE_WEIGHT[b] - LIKE_WEIGHT[a])[0];
    const reasonLabel = best ? REASON_TEXT[best] : "выбран для ЕГЭ";
    subjectWeights.set(id, { weight: w, reasonLabel });
    s.tags.forEach((t, i) => addTag(tags, t, w * (i === 0 ? 1 : 0.8), `предмет «${s.name}» — ${reasonLabel}`));
    if (w >= 0.6) {
      s.klimov.forEach((k) => (klimovRaw[k] += 0.5 * w));
      klimovSignals += 0.5;
    }
  }

  // Хобби
  for (const h of p.hobbies) {
    const def = HOBBIES.find((x) => x.id === h);
    if (!def) continue;
    def.tags.forEach((t, i) => addTag(tags, t, i === 0 ? 1 : 0.85, `хобби «${def.label.toLowerCase()}»`));
    def.klimov.forEach((k) => (klimovRaw[k] += 0.6));
    klimovSignals += 0.6;
  }
  if (p.hobbyOther.trim()) {
    parseDreamKeywords(p.hobbyOther).tags.forEach((t) => addTag(tags, t, 0.85, `хобби «${p.hobbyOther.trim().slice(0, 40)}»`));
  }

  // Свободный текст (вопрос 17): ключевые слова + теги ИИ, если есть
  const dream = parseDreamKeywords(p.dream);
  dream.tags.forEach((t) => addTag(tags, t, 0.9, "твои слова о мечте"));
  p.aiTags.forEach((t) => addTag(tags, t, 0.9, "твои слова о мечте (разбор ИИ)"));

  // Главный ориентир «интерес к предмету» и т.п. не даёт тегов, но достижения дают
  if (p.olympiad !== "none") {
    for (const [id, sw] of subjectWeights) {
      if ((p.subjectLikes[id] ?? []).includes("olympiad")) {
        subj.get(id)?.tags.forEach((t) => addTag(tags, t, 1, `олимпиада по предмету «${subj.get(id)?.name}»`));
      }
      void sw;
    }
  }

  // Пары задач (вопрос 15)
  const style = { hands: 0, head: 0, team: 0, solo: 0 };
  let pairsAnswered = 0;
  for (const pair of TASK_PAIRS) {
    const a = p.taskPairs[pair.id];
    if (!a) continue;
    pairsAnswered++;
    const sides = a === "both" ? [pair.left, pair.right] : [a === "left" ? pair.left : pair.right];
    const k = a === "both" ? 0.5 : 1;
    for (const side of sides) {
      if (side.klimov) klimovRaw[side.klimov] += 1.2 * k;
      if (side.style) style[side.style] += k;
    }
    if (pair.left.klimov) klimovSignals += 1.2;
  }

  const maxK = Math.max(...Object.values(klimovRaw));
  const klimov = klimovSignals > 0 && maxK > 0
    ? (Object.fromEntries(Object.entries(klimovRaw).map(([k, v]) => [k, v / maxK])) as Record<Klimov, number>)
    : null;

  const region = regions.find((r) => r.id === p.regionId) ?? null;
  const cityDef = region?.cities.find((c) => c.name === p.city) ?? region?.cities.find((c) => c.hub) ?? null;

  // Полнота анкеты → уверенность
  const checks: [boolean, string, number][] = [
    [p.start !== null, "отправная точка выбора", 0.5],
    [p.moneyHorizon !== null, "горизонт денег", 1],
    [p.regionId !== null, "регион", 1.5],
    [p.relocation !== null, "готовность к переезду", 1.5],
    [p.finance !== null, "финансы", 1],
    [p.ege.length > 0, "предметы ЕГЭ", 1.5],
    [p.ege.some((e) => e.score !== null), "баллы ЕГЭ", 1],
    [Object.keys(p.subjectLikes).length > 0, "почему нравятся предметы", 1],
    [p.hobbies.length > 0 || p.hobbyOther.trim().length > 0, "хобби", 1],
    [pairsAnswered >= 3, "тип задач", 1],
    [p.workFormats.length > 0, "формат работы", 0.5],
    [p.dream.trim().length >= 10, "мечта своими словами", 0.5],
    [p.uniCriteria.length > 0, "что важно в вузе", 0.5],
  ];
  const total = checks.reduce((s, c) => s + c[2], 0);
  const got = checks.reduce((s, c) => s + (c[0] ? c[2] : 0), 0);

  return {
    tags,
    klimov,
    style,
    formats: new Set(p.workFormats),
    subjectWeights,
    ege: new Map(p.ege.map((e) => [e.subject, e.score])),
    egeChosen: p.egeOrder === "chosen" && p.ege.length > 0 || (p.egeOrder === null && p.ege.length >= 3),
    region,
    city: cityDef?.name ?? null,
    cityCoef: cityDef?.salaryCoef ?? 1,
    completeness: got / total,
    missing: checks.filter((c) => !c[0]).map((c) => c[1]),
    values: dream.values,
    fears: dream.fears,
  };
}

/* ── Портрет ── */


export function buildPortrait(p: StudentProfile, m: UserModel): string {
  const g = p.gender === "f" ? "готова" : p.gender === "m" ? "готов" : "готов(а)";
  const parts: string[] = [];
  if (m.klimov) {
    const top = (Object.entries(m.klimov) as [Klimov, number][]).sort((a, b) => b[1] - a[1])[0][0];
    const style = m.style.hands > m.style.head ? PORTRAIT.hands : m.style.head > m.style.hands ? PORTRAIT.head : "";
    parts.push(PORTRAIT.start(PORTRAIT.types[top] + style));
  } else parts.push(PORTRAIT.unknownType);
  if (m.city) parts.push(PORTRAIT.from(prepositionalCity(m.city)));
  else if (m.region) parts.push(PORTRAIT.region(m.region.name));
  if (p.relocation) parts.push(PORTRAIT.relocation(p.relocation, g));
  if (p.moneyHorizon) parts.push(PORTRAIT.horizon(p.moneyHorizon, g));
  if (p.finance === "budget") parts.push(PORTRAIT.budget);
  return parts.filter(Boolean).join(" ");
}

export { genitiveCity };
