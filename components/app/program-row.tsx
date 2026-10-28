import Link from "next/link";
import { MapPin, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProgramMatch } from "@/lib/schemas";
import { UNI_CRITERIA } from "@/lib/engine/vocab";
import { CHANCE_TEXT, FORM_TEXT, PROGRAM } from "@/lib/copy";
import { rubK } from "@/lib/utils";
import { BudgetValue, PassValue } from "./pass-score";
import { PlanButton } from "./plan-button";
import { Term } from "./term";

const CHANCE_VARIANT = { high: "green", medium: "default", low: "yellow", risky: "red", unknown: "outline" } as const;
const FORM_TERM = { full: "full", evening: "evening", distance: "distance", online: "online" } as const;

export function ProgramRow({ pm, showExcluded = false }: { pm: ProgramMatch; showExcluded?: boolean }) {
  return (
    <div className="rounded-lg border p-3 text-sm" data-testid="program-row" data-region={pm.regionId} data-city={pm.city}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/university/${pm.universityId}`} className="font-medium text-primary hover:underline" data-testid="program-uni-link">
            {pm.universityShort}
          </Link>
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {pm.city}
          </span>
          <p className="text-muted-foreground">
            <Link href={`/specialty/${pm.specialtyCode}`} className="hover:underline">{pm.specialtyCode}</Link> · {pm.programName}
          </p>
        </div>
        <PlanButton kind="programs" id={pm.programId} label="★" />
      </div>
      {pm.exams && <p className="mt-1 text-xs" data-testid="exam-set">{PROGRAM.exams}: {pm.exams}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {pm.forms.map((f) => (
          <Badge key={f} variant="secondary">{f === "online" && <Wifi className="h-3 w-3" />}<Term k={FORM_TERM[f]}>{FORM_TEXT[f]}</Term></Badge>
        ))}
        <Badge variant={CHANCE_VARIANT[pm.chance]}>{PROGRAM.chance(CHANCE_TEXT[pm.chance])}</Badge>
        <PassValue official={pm.passOfficial} min={pm.passMin} max={pm.passMax} confidence={pm.passConfidence} userSum={pm.userSum} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <BudgetValue places={pm.budgetPlaces} />
        {pm.price !== null && pm.price > 0 && <> · {PROGRAM.paid(rubK(pm.price))}</>}
        {pm.price === null && <> · {PROGRAM.sponsored}</>}
        {pm.criteriaHits.length > 0 && <> · {PROGRAM.hits(pm.criteriaHits.slice(0, 3).map((c) => UNI_CRITERIA.find((x) => x.id === c)?.label.toLowerCase()).join(", "))}</>}
      </p>
      {showExcluded && pm.excluded.length > 0 && <p className="mt-1 text-xs text-bad">{PROGRAM.excluded(pm.excluded.map((e) => e.text).join("; "))}</p>}
    </div>
  );
}
