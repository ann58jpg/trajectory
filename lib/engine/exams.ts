import type { Program, Specialty } from "@/lib/schemas";
import { SUBJECT_SHORT } from "./ru";

/** Набор экзаменов полностью: «Русский + Математика (проф.) + Физика или Информатика + Доп. экзамен: нет». */
export function examSetText(spec: Specialty, program?: Program): string {
  if (spec.level === "spo") return "без ЕГЭ, по среднему баллу аттестата";
  const parts = spec.ege.mandatory.filter((s) => s !== "creative").map((s) => SUBJECT_SHORT[s] ?? s);
  if (spec.ege.oneOf.length) parts.push(spec.ege.oneOf.filter((s) => s !== "creative").map((s) => SUBJECT_SHORT[s] ?? s).join(" или "));
  void program;
  const hasCreative = spec.ege.mandatory.includes("creative") || spec.ege.oneOf.includes("creative");
  return `${parts.join(" + ")} + Доп. экзамен: ${hasCreative ? "творческий" : "нет"}`;
}
