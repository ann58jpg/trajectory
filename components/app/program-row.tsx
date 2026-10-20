import Link from "next/link";
import { MapPin, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProgramMatch } from "@/lib/schemas";
import { CHANCE_LABEL, FORM_LABEL, UNI_CRITERIA } from "@/lib/engine/vocab";
import { rubK } from "@/lib/utils";
import { SourceMark } from "./source-mark";
import { PlanButton } from "./plan-button";

const CHANCE_VARIANT = { high: "green", medium: "default", low: "yellow", risky: "red", unknown: "outline" } as const;

export function ProgramRow({ pm, showExcluded = false }: { pm: ProgramMatch; showExcluded?: boolean }) {
  const pass = pm.passMin !== null ? `${pm.passMin}–${pm.passMax ?? pm.passMin}` : null;
  const isSpo = pm.programId && pm.passMin !== null && pm.passMin > 300;
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
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {pm.forms.map((f) => (
          <Badge key={f} variant="secondary">{f === "online" && <Wifi className="h-3 w-3" />}{FORM_LABEL[f]}</Badge>
        ))}
        <Badge variant={CHANCE_VARIANT[pm.chance]} title={pm.userSum !== null ? `Твои баллы: ${pm.userSum}` : undefined}>
          шанс: {CHANCE_LABEL[pm.chance]}
        </Badge>
        {pass && (
          <span className="text-xs text-muted-foreground">
            {isSpo ? "ср. балл аттестата" : "проходной бюджет"} ≈ {isSpo ? `${(pm.passMin! / 100).toFixed(1)}–${((pm.passMax ?? pm.passMin!) / 100).toFixed(1)}` : pass}
            {pm.userSum !== null && !isSpo && <> · у тебя {pm.userSum}</>}{" "}
            <SourceMark source="Оценка по итогам приёма 2024–2025; проверь на сайте вуза" confidence={pm.passConfidence} />
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {pm.budgetPlaces > 0 ? `бюджет: ~${pm.budgetPlaces} мест` : "без бюджетных мест"}
        {pm.price !== null && pm.price > 0 && <> · платно ~{rubK(pm.price)}/год</>}
        {pm.price === null && " · обучение за счёт вуза/работодателя"}
        {pm.criteriaHits.length > 0 && <> · совпадает с важным для тебя: {pm.criteriaHits.slice(0, 3).map((c) => UNI_CRITERIA.find((x) => x.id === c)?.label.toLowerCase()).join(", ")}</>}
      </p>
      {showExcluded && pm.excluded.length > 0 && (
        <p className="mt-1 text-xs text-bad">Не подходит под твои условия: {pm.excluded.map((e) => e.text).join("; ")}</p>
      )}
    </div>
  );
}
