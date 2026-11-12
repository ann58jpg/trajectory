/**
 * Вайб вуза: 8 шкал (раздел 4.1 v3). Шкалы с вариантами по порядку («строго → свободно») считаются как число 0..1,
 * досуг и дух вуза — наборы, плюс 3 слова из 20 тегов.
 */
export const ORDINAL = ["discipline", "load", "extra", "work", "atmosphere", "campus"] as const;
export type OrdinalScale = (typeof ORDINAL)[number];
export const LEISURE = ["clubs", "nso", "creative", "sport", "library", "volunteer", "council", "cafe", "nothing"] as const;
export const SPIRIT = ["science", "career", "creative", "startup", "service", "activism"] as const;
export const TAGS = [
  "уютный", "душный", "тусовочный", "научный", "строгий", "свободный", "творческий", "амбициозный", "спокойный", "дружный",
  "современный", "старинный", "зелёный", "шумный", "домашний", "престижный", "практичный", "международный", "весёлый", "требовательный",
] as const;
export type Leisure = (typeof LEISURE)[number];
export type Spirit = (typeof SPIRIT)[number];

/** Ответ студента о своём вузе (одно устройство — один ответ на вуз). */
export type VibeAnswer = {
  universityId: string;
  faculty: string;
  course: number;
  ordinal: Partial<Record<OrdinalScale, number[]>>; // индексы вариантов по вопросам шкалы (их может быть два)
  leisure: Leisure[];
  spirit: Spirit[];
  tags: string[];
};

/** Вайб-профиль абитуриента: один ответ на шкалу. */
export type ApplicantVibe = {
  ordinal: Partial<Record<OrdinalScale, number>>;
  leisure: Leisure[];
  spirit: Spirit[];
};

/** Сколько вариантов у порядковой шкалы. */
export const OPTIONS: Record<OrdinalScale, number> = { discipline: 3, load: 3, extra: 3, work: 3, atmosphere: 3, campus: 3 };

export const MIN_ANSWERS = 10;

export type UniVibe = {
  universityId: string;
  count: number;
  demo: boolean;
  /** Распределение ответов по вариантам и среднее 0..1. */
  ordinal: Record<OrdinalScale, { dist: number[]; mean: number }>;
  leisure: { id: Leisure; share: number }[];
  spirit: { id: Spirit; share: number }[];
  tags: { tag: string; share: number }[];
};

const norm = (idx: number, n: number) => (n <= 1 ? 0.5 : idx / (n - 1));

/** Подсчёт вайба по ответам: распределения по шкалам, топ-5 досуга и тегов. Меньше MIN_ANSWERS — null. */
export function aggregate(universityId: string, answers: VibeAnswer[], demo = false): UniVibe | null {
  if (answers.length < MIN_ANSWERS) return null;
  const ordinal = {} as UniVibe["ordinal"];
  for (const s of ORDINAL) {
    const dist = new Array(OPTIONS[s]).fill(0);
    let sum = 0, n = 0;
    for (const a of answers) {
      const v = a.ordinal[s];
      if (!v?.length) continue;
      const avg = v.reduce((x, y) => x + y, 0) / v.length;
      dist[Math.round(avg)]++;
      sum += norm(avg, OPTIONS[s]);
      n++;
    }
    ordinal[s] = { dist, mean: n ? sum / n : 0.5 };
  }
  const top = <T extends string>(lists: T[][], k: number) => {
    const c = new Map<T, number>();
    for (const l of lists) for (const x of new Set(l)) c.set(x, (c.get(x) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([id, v]) => ({ id, share: v / answers.length }));
  };
  return {
    universityId, count: answers.length, demo, ordinal,
    leisure: top(answers.map((a) => a.leisure), 5),
    spirit: top(answers.map((a) => a.spirit), 3),
    tags: top(answers.map((a) => a.tags), 5).map((x) => ({ tag: x.id, share: x.share })),
  };
}

/** Есть ли у абитуриента хоть что-то в вайб-профиле. */
export const hasVibe = (v: ApplicantVibe | null | undefined) =>
  !!v && (Object.values(v.ordinal).some((x) => x !== undefined && x !== null) || v.leisure.length > 0 || v.spirit.length > 0);

/** Совпадение по вайбу 0..1: близость по шкалам + пересечение досуга и духа вуза. */
export function vibeMatch(a: ApplicantVibe, u: UniVibe): number {
  const parts: number[] = [];
  for (const s of ORDINAL) {
    const x = a.ordinal[s];
    if (x === undefined || x === null) continue;
    parts.push(1 - Math.abs(norm(x, OPTIONS[s]) - u.ordinal[s].mean));
  }
  if (a.leisure.length && !a.leisure.includes("nothing")) {
    const share = new Map(u.leisure.map((l) => [l.id, l.share]));
    parts.push(Math.min(1, a.leisure.reduce((s, l) => s + (share.get(l) ?? 0), 0) / a.leisure.length / 0.6));
  }
  if (a.spirit.length) {
    const share = new Map(u.spirit.map((l) => [l.id, l.share]));
    parts.push(Math.min(1, a.spirit.reduce((s, l) => s + (share.get(l) ?? 0), 0) / a.spirit.length / 0.6));
  }
  return parts.length ? parts.reduce((s, x) => s + x, 0) / parts.length : 0.5;
}

/** Оси «паутинки» 0..1: шкалы как есть; досуг и дух — насколько у вуза есть то, что важно тебе (у тебя 1). */
export function radar(a: ApplicantVibe | null, u: UniVibe | null): { axis: string; you: number | null; uni: number | null }[] {
  const ax = (s: OrdinalScale) => ({ axis: s, you: a?.ordinal[s] !== undefined && a?.ordinal[s] !== null ? norm(a!.ordinal[s]!, OPTIONS[s]) : null, uni: u ? u.ordinal[s].mean : null });
  const overlap = (mine: string[], theirs: { id: string; share: number }[]) => {
    if (!mine.length) return null;
    const m = new Map(theirs.map((t) => [t.id, t.share]));
    return Math.min(1, mine.reduce((s, x) => s + (m.get(x) ?? 0), 0) / mine.length / 0.6);
  };
  return [
    ...ORDINAL.map(ax),
    { axis: "leisure", you: a?.leisure.length ? 1 : null, uni: a && u ? overlap(a.leisure, u.leisure) : u ? Math.min(1, u.leisure.reduce((s, x) => s + x.share, 0) / 2) : null },
    { axis: "spirit", you: a?.spirit.length ? 1 : null, uni: a && u ? overlap(a.spirit, u.spirit) : u ? (u.spirit[0]?.share ?? 0) : null },
  ];
}

/** Тип для вайб-карточки: «Свободный исследователь», «Собранный творец»… */
export function vibeType(a: ApplicantVibe): { key: string; title: string } {
  const d = a.ordinal.discipline;
  const first = d === undefined || d === null ? "Любопытный" : d === 0 ? "Собранный" : d === 1 ? "Гибкий" : "Свободный";
  const sp = a.spirit[0];
  const second = sp === "science" ? "исследователь" : sp === "career" ? "стратег" : sp === "creative" ? "творец" : sp === "startup" ? "предприниматель" : sp === "service" ? "защитник" : sp === "activism" ? "активист" : "искатель";
  return { key: `${first}-${second}`, title: `${first} ${second}` };
}

/* ───────── Демо-вайб: сгенерированные ответы для 30 крупных вузов (по умолчанию выключено) ───────── */

export const DEMO_UNIS = [
  "msu", "spbu", "hse", "mipt", "bmstu", "itmo", "mephi", "kfu", "urfu", "nsu", "tpu", "tsu", "sfu", "dvfu", "sfedu",
  "kantiana", "unn", "ssau", "susu", "pstu", "vsu", "ranepa", "mgimo", "rudn", "fa", "rea", "sechenov", "spbpu", "gitis", "kubsu",
] as const;

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Демо-ответы. У ВШЭ ровно 9 — чтобы на показе было видно, как вайб появляется на 10-м ответе;
 * у остальных 10–16. Значения сгенерированы, это не отзывы студентов.
 */
export function demoAnswers(universityId: string): VibeAnswer[] {
  if (!(DEMO_UNIS as readonly string[]).includes(universityId)) return [];
  const r = rng(universityId);
  const n = universityId === "hse" ? 9 : 10 + Math.floor(r() * 7);
  const bias = Object.fromEntries(ORDINAL.map((s) => [s, Math.floor(r() * 3)])) as Record<OrdinalScale, number>;
  const out: VibeAnswer[] = [];
  for (let i = 0; i < n; i++) {
    const pick = (s: OrdinalScale) => Math.max(0, Math.min(2, bias[s] + (r() < 0.25 ? -1 : r() > 0.8 ? 1 : 0)));
    out.push({
      universityId, faculty: "демо", course: 1 + Math.floor(r() * 4),
      ordinal: Object.fromEntries(ORDINAL.map((s) => [s, [pick(s)]])),
      leisure: LEISURE.filter((_, k) => k < 8 && r() < (k + bias.extra) % 4 / 4 + 0.15),
      spirit: [SPIRIT[Math.floor(r() * SPIRIT.length)]],
      tags: [TAGS[Math.floor(r() * TAGS.length)], TAGS[Math.floor(r() * TAGS.length)], TAGS[Math.floor(r() * TAGS.length)]],
    });
  }
  return out;
}
