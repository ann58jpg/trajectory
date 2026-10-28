"use client";
import type { OfficialScore } from "@/lib/schemas";
import { PROGRAM } from "@/lib/copy";
import { usePresentation } from "@/lib/client/storage";
import { SourceMark } from "./source-mark";
import { DataGap } from "./data-gap";
import { Term } from "./term";

/**
 * Проходной балл по правилу показа данных: официальный (2026, иначе 2025 с пометкой) с источником;
 * иначе наша оценка с пометкой «оценка» (скрыта в режиме презентации); иначе — DataGap.
 */
export function PassValue({ official, min, max, confidence = "estimate", userSum = null }: {
  official: OfficialScore | null; min: number | null; max: number | null; confidence?: "verified" | "estimate"; userSum?: number | null;
}) {
  const [presentation] = usePresentation();
  if (official) {
    return (
      <span className="text-xs" data-testid="pass-official">
        <Term k="passScore">{PROGRAM.official(official.year, official.total)}</Term>
        {official.basis === "paid" && ` ${PROGRAM.basisPaid}`}
        {official.includesDvi && ` (${PROGRAM.withDvi})`}
        {official.year < 2026 && <span className="ml-1 rounded bg-warn/15 px-1 text-[11px]" data-testid="pass-2025">{PROGRAM.year2025}</span>}
        {userSum !== null && <> · {PROGRAM.yourSum(userSum)}</>}{" "}
        <a href={official.url} target="_blank" rel="noreferrer" className="text-primary hover:underline" title={`${official.source} · ${PROGRAM.checked(official.checkedAt)}`}>
          {PROGRAM.sourceLink}
        </a>
      </span>
    );
  }
  if (min !== null && !(presentation && confidence !== "verified")) {
    const spo = min > 300;
    const range = spo ? `${(min / 100).toFixed(1)}–${((max ?? min) / 100).toFixed(1)}` : `${min}–${max ?? min}`;
    return (
      <span className="text-xs text-muted-foreground" data-testid="pass-estimate">
        {spo ? PROGRAM.passGpa : <Term k="passScore">{PROGRAM.pass}</Term>} ≈ {range}
        {userSum !== null && !spo && <> · {PROGRAM.yourSum(userSum)}</>}{" "}
        <SourceMark source={PROGRAM.passGapWhere} confidence={confidence} />
      </span>
    );
  }
  return <DataGap what={PROGRAM.passGapWhat} where={PROGRAM.passGapWhere} compact />;
}

/** Число бюджетных мест: известно → число; не проверено → DataGap. */
export function BudgetValue({ places }: { places: number | null }) {
  if (places === null) return <DataGap what={PROGRAM.budgetGapWhat} where={PROGRAM.budgetGapWhere} compact />;
  return <span>{places > 0 ? PROGRAM.budget(places) : PROGRAM.noBudget}</span>;
}
