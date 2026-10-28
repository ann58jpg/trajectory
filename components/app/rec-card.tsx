"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, GraduationCap, Laptop, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Rec } from "@/lib/schemas";
import { contributions } from "@/lib/engine/scoring";
import type { WEIGHT_ANCHORS } from "@/lib/engine/config";
import { CARD, CHANCE_TEXT, COMMON, MATCH_TEXT, OUTLOOK_TEXT } from "@/lib/copy";
import { rubK, cn } from "@/lib/utils";
import { SourceMark } from "./source-mark";
import { PlanButton } from "./plan-button";
import { ProgramRow } from "./program-row";
import { FactorBar } from "./factor-bar";
import { CompareToggle } from "./compare";
import { Term } from "./term";
import { DataGap } from "./data-gap";
import { usePresentation } from "@/lib/client/storage";

const DOT = { green: "🟢", yellow: "🟡", red: "🔴" } as const;

/** Карточка профессии: три главные цифры, не больше двух значков, остальное — в «Подробнее». */
export function RecCard({
  rec, t, anchors, variant = "interests", rank, onlineHint,
}: { rec: Rec & { score?: number }; t: number; anchors: typeof WEIGHT_ANCHORS; variant?: "interests" | "money" | "compact"; rank?: number; onlineHint?: boolean }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [presentation] = usePresentation();
  const hideEstimate = presentation && rec.salary.confidence !== "verified";
  const s = rec.salary;
  const best = rec.programs[0];
  const badges: React.ReactNode[] = [];
  if (rec.earlyEntryCourse !== null && rec.earlyEntryCourse <= 2)
    badges.push(<Badge key="early" variant="secondary"><Zap className="h-3 w-3" />{CARD.earlyWork(rec.earlyEntryCourse)}</Badge>);
  if (rec.remote === "yes") badges.push(<Badge key="remote" variant="outline"><Laptop className="h-3 w-3" />{CARD.remote}</Badge>);

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5" data-testid="rec-card" data-profession={rec.professionId}>
      <div className="flex flex-wrap items-start gap-2">
        {rank !== undefined && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary">{rank}</span>}
        <div className="min-w-0 flex-1">
          <Link href={`/profession/${rec.professionId}`} className="font-semibold leading-snug hover:underline" data-testid="rec-link">
            {rec.name}
          </Link>
          {badges.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{badges.slice(0, 2)}</div>}
        </div>
      </div>

      {/* три главные цифры */}
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-primary/10 px-1 py-2">
          <dt className="text-muted-foreground">{CARD.salary5}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums" data-testid="card-salary">
            {hideEstimate ? <DataGap what={CARD.salaryGap} where={CARD.salaryGapWhere} compact /> : rubK(s.middle)}
          </dd>
        </div>
        <div className="rounded-md bg-muted/60 px-1 py-2">
          <dt className="text-muted-foreground">{CARD.chance}</dt>
          <dd className="mt-0.5 text-sm font-semibold">{best ? CHANCE_TEXT[best.chance] : "—"}</dd>
        </div>
        <div className="rounded-md bg-muted/60 px-1 py-2" title={rec.outlookReason}>
          <dt className="text-muted-foreground"><Term k="outlook">{CARD.outlook}</Term></dt>
          <dd className="mt-0.5 text-sm font-semibold" data-outlook={rec.outlook}><span aria-hidden>{DOT[rec.outlook]} </span>{OUTLOOK_TEXT[rec.outlook]}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {CARD.where}, {s.regionName} <SourceMark source={s.source} confidence={s.confidence} />
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setMore((x) => !x)} aria-expanded={more} data-testid="card-more">
          {COMMON.details} <ChevronDown className={cn("transition-transform", more && "rotate-180")} />
        </Button>
        {variant !== "compact" && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((x) => !x)} aria-expanded={open} data-testid="where-to-study">
            <GraduationCap /> {`Где учиться (${rec.programs.length})`} <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        )}
        <span className="ml-auto flex gap-1.5">
          <CompareToggle kind="profession" id={rec.professionId} />
          <PlanButton kind="professions" id={rec.professionId} />
        </span>
      </div>

      {more && (
        <div className="mt-3 space-y-3 rounded-lg bg-muted/40 p-3 text-sm" data-testid="card-details">
          <p><span className="font-medium">{CARD.matchLabel}:</span> {MATCH_TEXT(rec.factors.match)}</p>
          <div>
            <p className="font-medium">{CARD.why}</p>
            <ul className="list-inside list-disc space-y-0.5">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          {rec.tasks.length > 0 && (
            <div>
              <p className="font-medium">{CARD.tasksTitle}</p>
              <ul className="list-inside list-disc space-y-0.5">{rec.tasks.slice(0, 3).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            {[[CARD.ladder.start, s.junior], [CARD.ladder.mid, s.middle], [CARD.ladder.senior, s.senior], [CARD.ladder.ceiling, s.ceiling]].map(([l, v]) => (
              <div key={l as string} className="rounded-md bg-card px-1 py-1.5">
                <div className="text-muted-foreground">{l}</div>
                <div className="font-semibold tabular-nums">{rubK(v as number)}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{CARD.vacancies(rec.vacancies.toLocaleString("ru-RU"))} · {CARD.outlookWhy}: {rec.outlookReason}</p>
          <FactorBar parts={contributions(rec, t, anchors)} />
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2">
          {rec.programs.length === 0 && <p className="text-sm text-muted-foreground">{CARD.noPrograms}</p>}
          {rec.programs.map((pm) => <ProgramRow key={pm.programId} pm={pm} />)}
          {onlineHint && rec.onlineElsewhere > 0 && (
            <p className="text-xs text-muted-foreground">
              {CARD.onlineElsewhere(rec.onlineElsewhere)}{" "}
              <Link href={`/profession/${rec.professionId}`} className="text-primary hover:underline">{CARD.onlineLink}</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
