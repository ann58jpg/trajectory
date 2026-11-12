"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Heart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/misc";
import type { RecommendResponse } from "@/lib/schemas";
import { admissionYear, useProfile, useSettings } from "@/lib/storage";
import { downloadIcs, toIcs } from "@/lib/admission";
import { LOVED, QUIZ, SAFE } from "@/lib/copy";
import { rub } from "@/lib/utils";
import { DataGap } from "./data-gap";

type Safe = NonNullable<RecommendResponse["safeChoice"]>;
type Loved = NonNullable<RecommendResponse["returnLoved"]>;

/** «Безопасный выбор»: другие направления с теми же ЕГЭ, честные цифры, вопрос «если бы деньги и сложность не имели значения». */
export function SafeChoiceBlock({ s }: { s: Safe }) {
  const [settings] = useSettings();
  const [profile] = useProfile();
  const [pick, setPick] = useState<string | null>(null);
  const year = admissionYear(settings, profile.grade);
  const deadline = `${year}-02-01`;
  const deadlineText = new Date(deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const d = s.dream.find((x) => x.sphere === pick);
  return (
    <Card className="border-primary/30" data-testid="safe-choice">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" /> {SAFE.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{SAFE.lead}</p>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="space-y-2">
          <h3 className="font-semibold">{SAFE.altTitle}</h3>
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="safe-alternatives">
            {s.alternatives.map((a) => (
              <li key={a.code}><Link href={`/specialty/${a.code}`} className="block rounded-lg border p-3 hover:bg-muted" data-testid="safe-alt">
                <span className="font-medium">{a.name}</span>
                <span className="block text-xs text-muted-foreground">{[SAFE.programs(a.programs), a.budget !== null ? SAFE.budget(a.budget) : null, a.passMin !== null ? SAFE.pass(a.passMin) : null].filter(Boolean).join(" · ")}</span>
              </Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-2" data-testid="safe-honest">
          <h3 className="font-semibold">{SAFE.honestTitle}</h3>
          {s.honest.map((h) => (
            <div key={h.code} className="rounded-lg border p-3">
              <p className="font-medium">{h.name} · <span className={h.needs.length ? "text-bad" : "text-ok"}>{h.needs.length ? SAFE.needs(h.needs.join(", ")) : SAFE.ready}</span></p>
              {h.programs > 0 ? (
                <p className="text-xs text-muted-foreground">{[SAFE.programs(h.programs), h.budget !== null ? SAFE.budget(h.budget) : null, h.passMin !== null ? SAFE.pass(h.passMin) : null].filter(Boolean).join(" · ")}</p>
              ) : <DataGap what={SAFE.honestGapWhat} where={SAFE.honestGapWhere} compact />}
              {h.salary !== null && h.salaryName && <p className="text-xs text-muted-foreground">{SAFE.salary(h.salaryName, rub(h.salary))}</p>}
            </div>
          ))}
        </div>
        <div className="space-y-2" data-testid="safe-dream">
          <h3 className="font-semibold">{SAFE.dreamTitle}</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={SAFE.dreamPick}>
            {s.dream.map((x) => <Chip key={x.sphere} role="radio" selected={pick === x.sphere} onClick={() => setPick(x.sphere)} data-testid={`dream-${x.sphere}`}>{x.sphereName}</Chip>)}
          </div>
          {d && (
            <div className="space-y-2 rounded-lg bg-primary/5 p-3" data-testid="dream-result">
              <p>{SAFE.dreamResult(d.name, d.professionName)} {d.addName ? SAFE.dreamAdd(d.addName) : SAFE.dreamOk}</p>
              {d.addName && <p className="font-medium">{SAFE.deadline(deadlineText)}</p>}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link href={`/specialty/${d.code}`}>{SAFE.open}</Link></Button>
                {d.addName && <Button size="sm" onClick={() => downloadIcs(toIcs([{ id: "ege-change", title: SAFE.remindTitle, date: deadline, text: SAFE.dreamAdd(d.addName!) }], SAFE.remindTitle), "ege.ics")} data-testid="dream-remind"><CalendarPlus /> {SAFE.remind}</Button>}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** «Вернуть то, что ты любил»: 2–3 направления из забытого увлечения + кружки и курсы. */
export function ReturnLovedBlock({ l }: { l: Loved }) {
  const what = l.interests.map((x) => QUIZ.forgotten.options[x as keyof typeof QUIZ.forgotten.options] ?? x).join(", ");
  return (
    <Card data-testid="return-loved">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Heart className="h-5 w-5 text-primary" /> {LOVED.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{LOVED.lead(what, l.why)}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="grid gap-2 sm:grid-cols-3">
          {l.specialties.map((s) => (
            <li key={s.code}><Link href={`/specialty/${s.code}`} className="block h-full rounded-lg border p-3 hover:bg-muted" data-testid="loved-spec">
              <span className="font-medium">{s.name}</span>
              <span className="block text-xs text-muted-foreground">{s.reachable ? LOVED.reachable : LOVED.needs(s.needs.join(", "))} · {LOVED.programs(s.programs)}</span>
            </Link></li>
          ))}
        </ul>
        {l.courses.length > 0 && (
          <div className="space-y-1">
            <h3 className="font-semibold">{LOVED.courses}</h3>
            <ul className="flex flex-wrap gap-2">{l.courses.map((c) => <li key={c.url + c.title}><a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border px-3 py-1 hover:bg-muted">{c.title}</a></li>)}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
