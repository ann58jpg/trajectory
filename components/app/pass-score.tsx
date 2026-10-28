import type { Program } from "@/lib/schemas";
import { PROGRAM } from "@/lib/copy";
import { SourceMark } from "./source-mark";
import { Term } from "./term";

/** Проходной балл: официальный (2026/2025) с источником, иначе наша оценка с пометкой. */
export function PassScore({ program: p }: { program: Program }) {
  if (p.passScore.min === null) return null;
  const spo = p.passScore.min > 300;
  const range = spo
    ? `${(p.passScore.min / 100).toFixed(1)}–${((p.passScore.max ?? p.passScore.min) / 100).toFixed(1)}`
    : `${p.passScore.min}–${p.passScore.max ?? p.passScore.min}`;
  return (
    <p className="text-xs text-muted-foreground">
      {spo ? PROGRAM.passGpa : <Term k="passScore">{PROGRAM.pass}</Term>} ≈ {range} <SourceMark source={p.passScore.meta.source} confidence={p.passScore.meta.confidence} />
    </p>
  );
}
