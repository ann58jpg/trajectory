"use client";
import Link from "next/link";
import { useState } from "react";
import { Briefcase, ChevronDown, GraduationCap, Laptop, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Rec } from "@/lib/schemas";
import { contributions } from "@/lib/engine/scoring";
import type { WEIGHT_ANCHORS } from "@/lib/engine/config";
import { rubK, cn } from "@/lib/utils";
import { OutlookBadge } from "./outlook-badge";
import { SourceMark } from "./source-mark";
import { PlanButton } from "./plan-button";
import { ProgramRow } from "./program-row";
import { FactorBar } from "./factor-bar";

export function RecCard({
  rec, t, anchors, variant = "interests", rank, onlineHint,
}: { rec: Rec & { score?: number }; t: number; anchors: typeof WEIGHT_ANCHORS; variant?: "interests" | "money" | "compact"; rank?: number; onlineHint?: boolean }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  const s = rec.salary;
  return (
    <div className="rounded-lg border bg-card p-4" data-testid="rec-card" data-profession={rec.professionId}>
      <div className="flex flex-wrap items-start gap-2">
        {rank !== undefined && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary">{rank}</span>}
        <div className="min-w-0 flex-1">
          <Link href={`/profession/${rec.professionId}`} className="font-semibold leading-snug hover:underline" data-testid="rec-link">
            {rec.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <OutlookBadge status={rec.outlook} reason={rec.outlookReason} />
            {rec.earlyEntryCourse !== null && rec.earlyEntryCourse <= 2 && (
              <Badge variant="secondary"><Zap className="h-3 w-3" /> можно начать с {rec.earlyEntryCourse} курса</Badge>
            )}
            {rec.remote === "yes" && <Badge variant="outline"><Laptop className="h-3 w-3" /> удалёнка</Badge>}
            <span className="text-xs text-muted-foreground" title="Оценка числа вакансий в доступных тебе регионах">
              <Briefcase className="mr-0.5 inline h-3 w-3" />~{rec.vacancies.toLocaleString("ru-RU")} вак.
              {rec.vacanciesTrend >= 0.03 ? <TrendingUp className="ml-1 inline h-3 w-3 text-ok" /> : rec.vacanciesTrend <= -0.03 ? <TrendingDown className="ml-1 inline h-3 w-3 text-bad" /> : null}
            </span>
          </div>
        </div>
        <PlanButton kind="professions" id={rec.professionId} />
      </div>

      {/* зарплатная лестница */}
      <div className={cn("mt-3 grid gap-2 text-center text-xs", variant === "money" ? "grid-cols-4" : "grid-cols-3")}>
        {[
          ["старт", s.junior],
          ["через 3–5 лет", s.middle],
          ["опытный", s.senior],
          ...(variant === "money" ? [["потолок", s.ceiling] as const] : []),
        ].map(([label, v]) => (
          <div key={label as string} className={cn("rounded-md bg-muted/60 px-1 py-1.5", label === "через 3–5 лет" && "bg-primary/10")}>
            <div className="text-muted-foreground">{label}</div>
            <div className="font-semibold tabular-nums">{rubK(v as number)}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        в месяц, {s.regionName} <SourceMark source={s.source} confidence={s.confidence} />
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => setWhy((x) => !x)} aria-expanded={why}>
          Почему мне <ChevronDown className={cn("transition-transform", why && "rotate-180")} />
        </Button>
        {variant !== "compact" && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((x) => !x)} aria-expanded={open} data-testid="where-to-study">
            <GraduationCap /> Где учиться ({rec.programs.length}) <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        )}
      </div>

      {why && (
        <div className="mt-2 space-y-3 rounded-lg bg-muted/40 p-3 text-sm">
          <ul className="list-inside list-disc space-y-1">
            {rec.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <FactorBar parts={contributions(rec, t, anchors)} />
          <p className="text-xs text-muted-foreground">Перспектива на 5 лет: {rec.outlookReason}</p>
        </div>
      )}

      {open && (
        <div className="mt-2 space-y-2">
          {rec.programs.length === 0 && <p className="text-sm text-muted-foreground">Подходящих программ под твои условия нет.</p>}
          {rec.programs.map((pm) => <ProgramRow key={pm.programId} pm={pm} />)}
          {onlineHint && rec.onlineElsewhere > 0 && (
            <p className="text-xs text-muted-foreground">
              Ещё {rec.onlineElsewhere} онлайн-программ вузов из других регионов —{" "}
              <Link href={`/profession/${rec.professionId}`} className="text-primary hover:underline">смотреть на странице профессии</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
