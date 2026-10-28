import type { FactorKey } from "@/lib/schemas";
import { CARD, FACTOR_TEXT } from "@/lib/copy";

const COLORS: Record<FactorKey, string> = {
  match: "var(--primary)",
  income: "var(--accent)",
  demand: "var(--green)",
  employment: "var(--yellow)",
  priority: "var(--red)",
};

/** Из чего сложилась оценка варианта — полоска долей. */
export function FactorBar({ parts }: { parts: { key: FactorKey; value: number }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{CARD.breakdown}</p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={CARD.breakdown}>
        {parts.map((p) => (
          <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: COLORS[p.key] }} title={`${FACTOR_TEXT[p.key]}: ${Math.round((p.value / total) * 100)}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[p.key] }} />
            {FACTOR_TEXT[p.key]} {Math.round((p.value / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
