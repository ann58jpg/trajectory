import { DVI_TEXT, EXCLUDE } from "@/lib/copy";
import { effectiveDvi, egeCheck, hasBudget } from "./exams";
import type { ExclusionReason, Program, Region, Specialty, StudentProfile, University } from "@/lib/schemas";
import type { UserModel } from "./profile";

export const isOnline = (pr: Program) => pr.forms.includes("online") || pr.forms.includes("distance");

/** Регионы, доступные при данной готовности к переезду (без учёта онлайна). */
export function reachableRegionIds(p: StudentProfile, regions: Region[]): Set<string> | "all" | "all+abroad" {
  const home = regions.find((r) => r.id === p.regionId);
  switch (p.relocation) {
    case "abroad":
      return "all+abroad";
    case "russia":
    case null:
      return "all";
    case "nearest":
      return new Set(home ? [home.id, ...home.neighbors] : []);
    case "region":
    case "no":
      return new Set(home ? [home.id] : []);
  }
}

export { egeCheck } from "./exams";

/** Жёсткие фильтры 6.1. Возвращает причины исключения (пусто — программа проходит). */
export function hardFilter(
  pr: Program,
  uni: University,
  spec: Specialty,
  p: StudentProfile,
  m: UserModel,
  regions: Region[],
  egeNames: Map<string, string>,
): ExclusionReason[] {
  const reasons: ExclusionReason[] = [];
  const online = isOnline(pr);
  const local = Boolean(m.city) && uni.city === m.city;
  const reach = reachableRegionIds(p, regions);

  // Переезд
  if (uni.abroad) {
    if (reach !== "all+abroad") reasons.push({ type: "abroad", text: EXCLUDE.abroad(uni.country ?? EXCLUDE.abroadDefault) });
  } else if (p.relocation === "no") {
    if (!local && !online) reasons.push({ type: "relocation", text: EXCLUDE.move(uni.city) });
  } else if (reach instanceof Set) {
    if (!reach.has(uni.regionId) && !online) reasons.push({ type: "relocation", text: EXCLUDE.move(uni.city) });
  }

  // Финансы
  if (p.finance === "budget" && !hasBudget(pr)) {
    reasons.push({ type: "finance", text: pr.price ? EXCLUDE.noBudgetPaid(fmtRub(pr.price)) : EXCLUDE.noBudget });
  } else if (p.finance === "budget_or_paid" && !hasBudget(pr) && (pr.price ?? 0) > p.paidLimit) {
    reasons.push({ type: "finance", text: EXCLUDE.overLimit(fmtRub(pr.price ?? 0)) });
  }

  // Военная кафедра
  if (p.gender === "m" && p.vucImportant === "yes") {
    if (!uni.vuc) reasons.push({ type: "vuc", text: EXCLUDE.noVuc });
    else if (!pr.forms.includes("full")) reasons.push({ type: "vuc", text: EXCLUDE.vucFullOnly });
  }

  // Общежитие
  if (p.dorm === "yes" && !local && !online && !uni.dorm) reasons.push({ type: "dorm", text: EXCLUDE.noDorm });

  // ЕГЭ. Базовая математика профильную не заменяет — об этом говорим отдельно.
  if (!uni.abroad && m.egeChosen) {
    const c = egeCheck(spec, m.ege);
    if (c.mathBaseOnly) reasons.push({ type: "math_base", text: EXCLUDE.mathBase });
    const missing = c.missing.filter((s) => !(c.mathBaseOnly && s === "math"));
    const oneOf = c.mathBaseOnly && c.oneOfMissing.includes("math") ? [] : c.oneOfMissing;
    if (missing.length || oneOf.length) {
      const need = [...missing.map((s) => egeNames.get(s) ?? s), ...(oneOf.length ? [oneOf.map((s) => egeNames.get(s) ?? s).join(" или ")] : [])];
      reasons.push({ type: "ege", text: EXCLUDE.ege(need.join(", ")) });
    }
  }

  // Доп. экзамен в вузе: если человек сказал, к каким готов, а этого вида нет — программа уходит в «Если готов изменить»
  const dvi = effectiveDvi(spec, pr);
  if (!uni.abroad && dvi && p.dviReady.length > 0 && !p.dviReady.includes(dvi)) {
    reasons.push({ type: "dvi", text: EXCLUDE.dvi(DVI_TEXT[dvi].short) });
  }
  return reasons;
}

export const fmtRub = (n: number) => `${Math.round(n / 1000).toLocaleString("ru-RU")} тыс. ₽`;
