import type { DviType, Program, Specialty } from "@/lib/schemas";
import { DVI_TEXT, EXAMS } from "@/lib/copy";
import { SUBJECT_SHORT } from "./ru";

/** Есть ли бюджетные места. null — число не проверено, но бюджет в вузе есть (иначе в данных стоит 0). */
export function hasBudget(pr: { budgetPlaces: number | null }): boolean {
  return pr.budgetPlaces === null || pr.budgetPlaces > 0;
}

/** Доп. экзамен программы: свой у программы или как у направления. */
export function effectiveDvi(spec: Specialty, program?: Pick<Program, "dvi"> | null): DviType | null {
  if (program && program.dvi !== undefined) return program.dvi;
  return spec.dvi ?? null;
}

export type EgeCheck = {
  ok: boolean;
  missing: string[]; // обязательные предметы, которых нет
  oneOfMissing: string[]; // группа «на выбор», если не закрыта ни одним предметом
  mathBaseOnly: boolean; // нужна профильная математика, а у человека только базовая
};

/** Подходит ли набор ЕГЭ. Базовая математика профильную не заменяет. */
export function egeCheck(spec: Specialty, ege: Map<string, number | null>): EgeCheck {
  if (spec.level === "spo") return { ok: true, missing: [], oneOfMissing: [], mathBaseOnly: false };
  const has = (s: string) => ege.has(s);
  const missing = spec.ege.mandatory.filter((s) => !has(s));
  const oneOfOk = spec.ege.oneOf.length === 0 || spec.ege.oneOf.some(has);
  const needsMath = spec.ege.mandatory.includes("math") || (!oneOfOk && spec.ege.oneOf.includes("math"));
  const mathBaseOnly = needsMath && !has("math") && has("math_base");
  return { ok: missing.length === 0 && oneOfOk, missing, oneOfMissing: oneOfOk ? [] : spec.ege.oneOf, mathBaseOnly };
}

/** «Русский + Математика (проф.) + Физика или Информатика + Доп. экзамен: нет». */
export function examSetText(spec: Specialty, program?: Pick<Program, "dvi"> | null): string {
  if (spec.level === "spo") return EXAMS.spo;
  const parts = spec.ege.mandatory.map((s) => SUBJECT_SHORT[s] ?? s);
  if (spec.ege.oneOf.length) parts.push(spec.ege.oneOf.map((s) => SUBJECT_SHORT[s] ?? s).join(EXAMS.or));
  const dvi = effectiveDvi(spec, program);
  parts.push(dvi ? EXAMS.dvi(DVI_TEXT[dvi].short) : EXAMS.dviNone);
  return parts.join(" + ");
}
