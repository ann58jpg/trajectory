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

/** Проверка ЕГЭ: выполнены ли обязательные предметы и предмет по выбору. Творческое испытание сдаётся в вузе (ДВИ). */
export function egeCheck(spec: Specialty, ege: Map<string, number | null>): { ok: boolean; missing: string[]; oneOfMissing: string[] } {
  if (spec.level === "spo") return { ok: true, missing: [], oneOfMissing: [] };
  const missing = spec.ege.mandatory.filter((s) => s !== "creative" && !ege.has(s));
  const oneOfOk = spec.ege.oneOf.length === 0 || spec.ege.oneOf.some((s) => s === "creative" || ege.has(s));
  return { ok: missing.length === 0 && oneOfOk, missing, oneOfMissing: oneOfOk ? [] : spec.ege.oneOf };
}

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
  const local = !!m.city && uni.city === m.city;
  const reach = reachableRegionIds(p, regions);

  // Переезд
  if (uni.abroad) {
    if (reach !== "all+abroad") reasons.push({ type: "abroad", text: `зарубежный вуз (${uni.country ?? "за рубежом"})` });
  } else if (p.relocation === "no") {
    if (!local && !online) reasons.push({ type: "relocation", text: `нужен переезд в ${uni.city}` });
  } else if (reach instanceof Set) {
    if (!reach.has(uni.regionId) && !online) reasons.push({ type: "relocation", text: `нужен переезд в ${uni.city}` });
  }

  // Финансы
  if (p.finance === "budget" && pr.budgetPlaces <= 0) {
    reasons.push({ type: "finance", text: pr.price ? `нет бюджетных мест, платно ~${fmtRub(pr.price)}/год` : "нет бюджетных мест" });
  } else if (p.finance === "budget_or_paid" && pr.budgetPlaces <= 0 && (pr.price ?? 0) > p.paidLimit) {
    reasons.push({ type: "finance", text: `платно ~${fmtRub(pr.price ?? 0)}/год — выше твоего лимита` });
  }

  // ВУЦ
  if (p.gender === "m" && p.vucImportant === "yes") {
    if (!uni.vuc) reasons.push({ type: "vuc", text: "нет военного учебного центра" });
    else if (!pr.forms.includes("full")) reasons.push({ type: "vuc", text: "ВУЦ доступен только при очной форме" });
  }

  // Общежитие
  if (p.dorm === "yes" && !local && !online && !uni.dorm) reasons.push({ type: "dorm", text: "нет общежития" });

  // ЕГЭ
  if (!uni.abroad && m.egeChosen) {
    const c = egeCheck(spec, m.ege);
    if (!c.ok) {
      const need = [
        ...c.missing.map((s) => egeNames.get(s) ?? s),
        ...(c.oneOfMissing.length ? [c.oneOfMissing.map((s) => egeNames.get(s) ?? s).join(" или ")] : []),
      ];
      reasons.push({ type: "ege", text: `нужен ЕГЭ: ${need.join(", ")}` });
    }
  }
  return reasons;
}

export const fmtRub = (n: number) => `${Math.round(n / 1000).toLocaleString("ru-RU")} тыс. ₽`;
