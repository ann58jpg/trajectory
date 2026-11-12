import type { ProgramMatch, StudentProfile } from "@/lib/schemas";
import type { Catalog } from "@/lib/data/validate";
import type { UserModel } from "./profile";
import { egeCheck } from "./exams";
import { tagScore } from "./scoring";
import { catalogIndex } from "./index";
import { CARDS, SPHERES } from "./game";
import { SUBJECT_ACC } from "./ru";

/* ───────── «Безопасный выбор» (раздел 8 v3) ───────── */

const PROFILE_SUBJECTS = ["math", "phys", "chem", "bio", "inf"];
const SAFE_WHY = ["easiest", "advised", "unsure"] as const;
const HONEST = [
  { code: "38.03.02", professionId: "manager" },
  { code: "38.03.01", professionId: "economist" },
];

export type SafeAlt = { code: string; name: string; programs: number; budget: number | null; passMin: number | null };
export type HonestRow = SafeAlt & { needs: string[]; salary: number | null; salaryName: string | null };
export type DreamOption = { sphere: string; sphereName: string; code: string; name: string; add: string | null; addName: string | null; professionName: string };
export type SafeChoice = { subjects: string[]; alternatives: SafeAlt[]; honest: HonestRow[]; dream: DreamOption[] };

/** Когда показывать: общество + язык (или общество без профильных предметов) и выбор «потому что проще / посоветовали / не знаю». */
export function needsSafeChoice(p: StudentProfile): boolean {
  const subj = p.ege.map((e) => e.subject).filter((s) => s !== "rus" && s !== "math_base");
  const socLang = subj.length === 2 && subj.includes("soc") && subj.includes("foreign");
  const socOnly = subj.includes("soc") && !subj.some((s) => PROFILE_SUBJECTS.includes(s));
  return (socLang || socOnly) && p.egeWhy.some((w) => (SAFE_WHY as readonly string[]).includes(w));
}

function summary(code: string, list: ProgramMatch[]): Omit<SafeAlt, "code" | "name"> {
  const budget = list.map((x) => x.budgetPlaces).filter((x): x is number => x !== null);
  const pass = list.map((x) => x.passOfficial?.total ?? x.passMin).filter((x): x is number => x !== null);
  void code;
  return { programs: list.length, budget: budget.length ? budget.reduce((a, b) => a + b, 0) : null, passMin: pass.length ? Math.min(...pass) : null };
}

export function computeSafeChoice(p: StudentProfile, m: UserModel, catalog: Catalog, programs: Map<string, ProgramMatch>): SafeChoice | null {
  if (!needsSafeChoice(p)) return null;
  const ix = catalogIndex(catalog);
  const bySpec = new Map<string, ProgramMatch[]>();
  for (const pm of programs.values()) bySpec.set(pm.specialtyCode, [...(bySpec.get(pm.specialtyCode) ?? []), pm]);
  const ok = (code: string) => (bySpec.get(code) ?? []).filter((x) => x.excluded.length === 0);
  const honestCodes = new Set(HONEST.map((h) => h.code));

  // те же предметы ЕГЭ, другие направления — по интересу
  const alternatives = catalog.specialties
    .filter((s) => s.level !== "spo" && !honestCodes.has(s.code) && egeCheck(s, m.ege).ok && ok(s.code).length > 0)
    .map((s) => ({ s, interest: tagScore(s.tags, m).score }))
    .sort((a, b) => b.interest - a.interest)
    .slice(0, 5)
    .map(({ s }) => ({ code: s.code, name: s.name, ...summary(s.code, ok(s.code)) }));

  // честные цифры для менеджмента и экономики
  const honest = HONEST.map(({ code, professionId }) => {
    const s = ix.specialties.get(code)!;
    const c = egeCheck(s, m.ege);
    const needs = [...c.missing, ...(c.oneOfMissing.length ? [c.oneOfMissing[0]] : [])].filter((x) => x !== "rus").map((x) => SUBJECT_ACC[x] ?? x);
    const all = (bySpec.get(code) ?? []).filter((x) => x.excluded.every((e) => e.type === "ege" || e.type === "math_base"));
    const prof = ix.professions.get(professionId);
    return { code, name: s.name, ...summary(code, all), needs, salary: prof?.salary.middle ?? null, salaryName: prof?.name ?? null };
  });

  // «Если бы деньги и сложность не имели значения…» — по сфере: лучшее направление и какой один предмет добавить
  const sphereProfs = new Map<string, Set<string>>();
  for (const c of CARDS) (sphereProfs.get(c.sphere) ?? sphereProfs.set(c.sphere, new Set()).get(c.sphere)!).add(c.professionId);
  const dream: DreamOption[] = [];
  for (const sp of SPHERES) {
    let best: (DreamOption & { rank: number }) | null = null;
    for (const pid of sphereProfs.get(sp.id) ?? []) {
      const prof = ix.professions.get(pid);
      if (!prof) continue;
      for (const code of prof.specialties) {
        const s = ix.specialties.get(code);
        if (!s || s.level === "spo" || !sp.groups.includes(code.slice(0, 2))) continue;
        const c = egeCheck(s, m.ege);
        const need = [...c.missing, ...(c.oneOfMissing.length ? [c.oneOfMissing[0]] : [])].filter((x) => x !== "rus");
        if (need.length > 1) continue;
        const rank = (need.length ? 0 : 1) + (bySpec.get(code)?.length ?? 0) / 1000;
        if (!best || rank > best.rank)
          best = { sphere: sp.id, sphereName: sp.name, code, name: s.name, add: need[0] ?? null, addName: need[0] ? SUBJECT_ACC[need[0]] ?? need[0] : null, professionName: prof.name, rank };
      }
    }
    if (best) {
      const { rank: _r, ...rest } = best;
      void _r;
      dream.push(rest);
    }
  }
  const subjects = p.ege.map((e) => e.subject).filter((s) => s !== "rus");
  return { subjects, alternatives, honest, dream };
}

/* ───────── «Вернуть то, что ты любил» ───────── */

export const FORGOTTEN_TAGS: Record<string, string[]> = {
  draw: ["design", "art"], stories: ["writing", "media"], tech: ["engineering", "electronics", "robotics"], animals: ["animals", "biology"],
  stage: ["theatre", "art", "music"], sport: ["sport"], music: ["music", "art"], build: ["engineering", "architecture", "construction"],
  experiments: ["chemistry", "physics", "biology"], video: ["film", "media", "design"], sew: ["fashion", "design"], cook: ["food"],
};

/** Кружки и курсы: только проверенные площадки (ссылки открывались 12.11.2026). */
export const COURSES: Record<string, { title: string; url: string }[]> = {
  any: [{ title: "Кружки, школы и олимпиады — olimpiada.ru", url: "https://olimpiada.ru/activities" }],
  draw: [{ title: "Сириус: направление «Искусство»", url: "https://sochisirius.ru/" }, { title: "Онлайн-курсы по рисунку и дизайну на Stepik", url: "https://stepik.org/catalog/search?q=%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD" }],
  stories: [{ title: "Курсы по писательству на Stepik", url: "https://stepik.org/catalog/search?q=%D1%82%D0%B5%D0%BA%D1%81%D1%82" }],
  tech: [{ title: "Сириус: «Наука» и «Технологии»", url: "https://sochisirius.ru/" }],
  experiments: [{ title: "Сириус: направление «Наука»", url: "https://sochisirius.ru/" }],
  build: [{ title: "Сириус: «Технологии»", url: "https://sochisirius.ru/" }],
  video: [{ title: "Курсы по видео и монтажу на Stepik", url: "https://stepik.org/catalog/search?q=%D0%B2%D0%B8%D0%B4%D0%B5%D0%BE" }],
  music: [{ title: "Сириус: направление «Искусство»", url: "https://sochisirius.ru/" }],
  stage: [{ title: "Сириус: направление «Искусство»", url: "https://sochisirius.ru/" }],
  sport: [{ title: "Сириус: направление «Спорт»", url: "https://sochisirius.ru/" }],
};

export type LovedSpec = { code: string; name: string; reachable: boolean; needs: string[]; programs: number };
export type ReturnLoved = { interests: string[]; why: "no_time" | "not_serious"; specialties: LovedSpec[]; courses: { title: string; url: string }[] };

export function computeReturnLoved(p: StudentProfile, m: UserModel, catalog: Catalog, programs: Map<string, ProgramMatch>): ReturnLoved | null {
  if (!p.forgotten.length || (p.forgottenWhy !== "no_time" && p.forgottenWhy !== "not_serious")) return null;
  const tags = new Set(p.forgotten.flatMap((f) => FORGOTTEN_TAGS[f] ?? []));
  if (!tags.size) return null;
  const count = new Map<string, number>();
  for (const pm of programs.values()) if (pm.excluded.every((e) => e.type === "ege" || e.type === "dvi" || e.type === "math_base")) count.set(pm.specialtyCode, (count.get(pm.specialtyCode) ?? 0) + 1);
  const specialties = catalog.specialties
    .filter((s) => s.level !== "spo" && (count.get(s.code) ?? 0) > 0)
    .map((s) => ({ s, hit: s.tags.filter((t) => tags.has(t)).length / Math.max(1, Math.min(3, s.tags.length)) }))
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit || (count.get(b.s.code) ?? 0) - (count.get(a.s.code) ?? 0))
    .slice(0, 3)
    .map(({ s }) => {
      const c = egeCheck(s, m.ege);
      const needs = [...c.missing, ...(c.oneOfMissing.length ? [c.oneOfMissing[0]] : [])].filter((x) => x !== "rus").map((x) => SUBJECT_ACC[x] ?? x);
      return { code: s.code, name: s.name, reachable: c.ok, needs, programs: count.get(s.code) ?? 0 };
    });
  const courses = [...new Map([...p.forgotten.flatMap((f) => COURSES[f] ?? []), ...COURSES.any].map((c) => [c.url + c.title, c])).values()].slice(0, 4);
  return { interests: p.forgotten, why: p.forgottenWhy, specialties, courses };
}

