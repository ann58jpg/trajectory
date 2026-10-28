"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, Coins, GitCompare, Heart, Info, RefreshCcw, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { RecCard } from "@/components/app/rec-card";
import { ProgramRow } from "@/components/app/program-row";
import { PlanButton } from "@/components/app/plan-button";
import { EventItem } from "@/components/app/events-block";
import { Feedback } from "@/components/app/feedback";
import { KEYS, readLS, useProfile, useWeights, writeLS } from "@/lib/client/storage";
import { rankRecs } from "@/lib/engine/scoring";
import { buildDirections, type Direction } from "@/lib/engine/directions";
import type { Rec, RecommendResponse, Tradeoff, UniEvent } from "@/lib/schemas";
import { RecommendResponse as RecommendResponseSchema } from "@/lib/schemas";
import { cn, rub } from "@/lib/utils";
import { z } from "zod";
import { yearsWord } from "@/lib/engine/ru";
import { COMPARE, RESULTS } from "@/lib/copy";
import { track } from "@/lib/analytics";

type State = { status: "idle" | "loading" | "error" | "ok"; data?: RecommendResponse; error?: string; hint?: string };
type Mode = "interests" | "money";
type Ranked = Rec & { score: number };

export function Results() {
  const [profile, , ready] = useProfile();
  const [anchors] = useWeights();
  const [state, setState] = useState<State>({ status: "idle" });
  const [mode, setModeState] = useState<Mode | null>(null);

  const load = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const json = await res.json();
      if (!res.ok) return setState({ status: "error", error: json.error ?? RESULTS.errorTitle, hint: json.hint });
      const parsed = RecommendResponseSchema.safeParse(json);
      if (!parsed.success) return setState({ status: "error", error: RESULTS.errorBadAnswer, hint: RESULTS.errorBadAnswerHint });
      setState({ status: "ok", data: parsed.data });
      // стартовый режим — по первому ответу анкеты, дальше — как переключил сам человек
      setModeState(readLS(KEYS.mode, z.enum(["interests", "money"]), parsed.data.startT >= 0.75 ? "money" : "interests"));
      track("results_view", { mode: parsed.data.startT >= 0.75 ? "money" : "interests", confidence: parsed.data.confidence });
    } catch {
      setState({ status: "error", error: RESULTS.errorNetwork, hint: RESULTS.errorNetworkHint });
    }
  };

  useEffect(() => {
    if (ready && profile.consent) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const m: Mode = mode ?? "interests";
  const setMode = (v: Mode) => {
    if (v === m) return;
    setModeState(v);
    writeLS(KEYS.mode, v);
    track("mode_switch", { to: v });
  };

  const t = m === "money" ? 1 : 0;
  const ranked = useMemo(() => (state.data ? rankRecs(state.data.recs, t, { anchors, moneyMode: m === "money" }) : []), [state.data, t, anchors, m]);
  const dirs = useMemo(
    () => (state.data ? buildDirections(ranked, (c) => (state.data!.specialtyPrograms[c]?.length ?? 0) > 0, { likedGroups: state.data.likedGroups }) : { top: [], similar: {} }),
    [ranked, state.data],
  );

  if (!ready || state.status === "loading" || (profile.consent && state.status === "idle")) return <ResultsSkeleton />;

  if (!profile.consent) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">{RESULTS.noConsentTitle}</h1>
        <p className="mt-2 text-muted-foreground">{RESULTS.noConsentText}</p>
        <Button asChild size="lg" className="mt-6"><Link href="/quiz">{RESULTS.start} <ArrowRight /></Link></Button>
      </div>
    );
  }

  if (state.status === "error" || !state.data) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center" role="alert">
        <AlertTriangle className="mx-auto h-10 w-10 text-bad" />
        <h1 className="mt-3 text-xl font-bold">{state.error ?? RESULTS.errorTitle}</h1>
        {state.hint && <p className="mt-2 text-sm text-muted-foreground">{state.hint}</p>}
        <Button className="mt-6" onClick={load}><RefreshCcw /> {RESULTS.retry}</Button>
      </div>
    );
  }

  const d = state.data;
  const specName = new Map(d.specialties.map((s) => [s.code, s]));
  const conf = Math.round(d.confidence * 100);
  const shownUnis = new Set(dirs.top.flatMap((x) => (d.specialtyPrograms[x.code] ?? []).map((p) => p.universityId)));

  return (
    <div className="space-y-8 pt-6" data-testid="results">
      {/* Портрет и переключатель */}
      <Card className="hero-bg overflow-hidden">
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col-reverse items-start justify-between gap-2 sm:flex-row sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{RESULTS.portrait}</p>
              <h1 className="text-lg font-semibold leading-snug sm:text-xl" data-testid="portrait">{d.portrait}</h1>
            </div>
            <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
              <Badge variant={conf >= 80 ? "green" : conf >= 50 ? "yellow" : "red"} data-testid="confidence" title={RESULTS.confidenceHint(d.missing)}>
                {RESULTS.confidence(conf)}
              </Badge>
              {d.mode === "demo" && <span className="text-[11px] text-muted-foreground">{RESULTS.templates}</span>}
            </div>
          </div>
          {d.missing.length > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {RESULTS.skipped(d.missing.join(", "))} <Link href="/quiz" className="text-primary hover:underline">{RESULTS.fill}</Link>
            </p>
          )}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{RESULTS.modeLabel}</p>
            <div className="inline-grid w-full grid-cols-2 rounded-lg border bg-card p-1 sm:w-auto" role="radiogroup" aria-label={RESULTS.modeLabel}>
              {([["interests", RESULTS.modeInterests, Heart], ["money", RESULTS.modeMoney, Coins]] as const).map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={m === v}
                  onClick={() => setMode(v)}
                  data-testid={`mode-${v}`}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    m === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{RESULTS.modeHint}</p>
          </div>
        </CardContent>
      </Card>

      {d.egeAdvice.length > 0 && profile.egeOrder !== "chosen" && (
        <Card>
          <CardHeader><CardTitle className="text-base">{RESULTS.egeTitle}</CardTitle></CardHeader>
          <CardContent><ul className="list-inside list-disc space-y-1 text-sm">{d.egeAdvice.map((a) => <li key={a}>{a}</li>)}</ul></CardContent>
        </Card>
      )}

      {/* Направления */}
      <section className="space-y-4" data-testid="directions" data-mode={m}>
        <div>
          <h2 className="text-lg font-semibold">{m === "money" ? RESULTS.moneyTitle : RESULTS.tabs.interests}</h2>
          <p className="text-sm text-muted-foreground">{m === "money" ? RESULTS.moneyIntro : RESULTS.interestsIntro}</p>
        </div>
        {dirs.top.length === 0 && <Empty text={m === "money" ? RESULTS.emptyMoney : RESULTS.emptyInterests} />}
        {dirs.top.map((g, n) => (
          <DirectionCard key={g.code} n={n + 1} dir={g} similar={dirs.similar[g.code] ?? []} data={d} specName={specName} t={t} anchors={anchors} relocationNo={profile.relocation === "no"} />
        ))}
        {d.comparison.interests && d.comparison.money && (
          <Button asChild variant="outline" size="sm">
            <Link href="/compare" onClick={() => track("compare_open", { from: "results" })} data-testid="compare-default"><GitCompare /> {COMPARE.defaultIntro}</Link>
          </Button>
        )}
      </section>

      <UpcomingEvents events={d.upcomingEvents} shownUnis={shownUnis} unis={uniNames(d)} />

      <TradeoffsBlock tradeoffs={d.tradeoffs} />

      <Feedback mode={m} />

      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground" data-testid="disclaimer">{RESULTS.disclaimer}</p>
    </div>
  );
}

function uniNames(d: RecommendResponse): Map<string, string> {
  const map = new Map<string, string>();
  for (const list of Object.values(d.specialtyPrograms)) for (const p of list) map.set(p.universityId, `${p.universityShort}, ${p.city}`);
  return map;
}

function DirectionCard({
  n, dir, similar, data, specName, t, anchors, relocationNo,
}: {
  n: number; dir: Direction<Ranked>; similar: Direction<Ranked>[]; data: RecommendResponse; t: number; anchors: Parameters<typeof RecCard>[0]["anchors"];
  specName: Map<string, { code: string; name: string; level: string; years: number }>; relocationNo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const spec = specName.get(dir.code);
  const programs = data.specialtyPrograms[dir.code] ?? [];
  const level = (spec?.level ?? "bachelor") as keyof typeof RESULTS.levelLabel;
  return (
    <Card data-testid="specialty-group" data-code={dir.code}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{n}</Badge>
          <Link href={`/specialty/${dir.code}`} className="hover:underline"><CardTitle className="text-base sm:text-lg">{spec?.name ?? dir.code}</CardTitle></Link>
        </div>
        <CardDescription>{dir.code} · {RESULTS.levelLabel[level]} · {spec ? yearsWord(spec.years) : ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {dir.recs.map((r) => <RecCard key={r.professionId} rec={r} t={t} anchors={anchors} variant="compact" />)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="specialty-where">{RESULTS.whereToStudy(programs.length)}</Button>
          {similar.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowSimilar(!showSimilar)} aria-expanded={showSimilar} data-testid="show-similar">
              {showSimilar ? RESULTS.hideSimilar : RESULTS.showSimilar(similar.length)}
            </Button>
          )}
        </div>
        {open && (
          <div className="space-y-2" data-testid="specialty-programs">
            {programs.map((pm) => <ProgramRow key={pm.programId} pm={pm} />)}
            {relocationNo && <p className="text-xs text-muted-foreground">{RESULTS.relocationNoNote}</p>}
          </div>
        )}
        {showSimilar && (
          <ul className="space-y-2" data-testid="similar-list">
            {similar.map((s) => (
              <li key={s.code} className="rounded-lg border p-3 text-sm">
                <Link href={`/specialty/${s.code}`} className="font-medium text-primary hover:underline">{specName.get(s.code)?.name ?? s.code}</Link>
                <span className="text-xs text-muted-foreground"> · {s.code} · {RESULTS.whereToStudy(data.specialtyPrograms[s.code]?.length ?? 0)}</span>
                <p className="mt-1 text-xs text-muted-foreground">{s.recs.map((r) => r.name).join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingEvents({ events, shownUnis, unis }: { events: UniEvent[]; shownUnis: Set<string>; unis: Map<string, string> }) {
  const today = new Date();
  const limit = new Date(today.getTime() + 31 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const month = events.filter((e) => e.date! <= limit);
  // сначала события вузов из твоей подборки, потом остальных, прошедших фильтры
  const list = [...month.filter((e) => shownUnis.has(e.universityId)), ...month.filter((e) => !shownUnis.has(e.universityId))].slice(0, 5);
  const later = list.length === 0 ? events.slice(0, 3) : [];
  return (
    <section className="space-y-3" data-testid="upcoming-events">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="h-5 w-5 text-primary" /> {RESULTS.eventsTitle}</h2>
      <p className="text-sm text-muted-foreground">{RESULTS.eventsIntro}</p>
      {list.length > 0 && <ul className="space-y-2">{list.map((e) => <EventItem key={e.id} e={e} uniName={unis.get(e.universityId)} />)}</ul>}
      {list.length === 0 && (
        <>
          <Empty text={RESULTS.eventsEmpty} />
          {later.length > 0 && (
            <>
              <p className="text-sm font-medium">{RESULTS.eventsLater}</p>
              <ul className="space-y-2">{later.map((e) => <EventItem key={e.id} e={e} uniName={unis.get(e.universityId)} />)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function TradeoffsBlock({ tradeoffs }: { tradeoffs: Tradeoff[] }) {
  return (
    <section className="space-y-3" data-testid="tradeoffs">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="h-5 w-5 text-primary" /> {RESULTS.tradeoffsTitle}</h2>
      <p className="text-sm text-muted-foreground">{RESULTS.tradeoffsIntro}</p>
      {tradeoffs.length === 0 && <Empty text={RESULTS.tradeoffsEmpty} />}
      <div className="grid gap-3 lg:grid-cols-2">
        {tradeoffs.map((t) => (
          <Card key={t.professionId + t.programId} className="border-primary/30" data-testid="tradeoff-card">
            <CardContent className="space-y-3 pt-5">
              <p className="text-sm leading-relaxed" data-testid="tradeoff-sentence">{t.sentence}</p>
              {t.gainPct >= 0.05 && (
                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="rounded-md bg-muted/60 p-2">
                    <div className="text-xs text-muted-foreground">{RESULTS.tradeoffNow}</div>
                    <div className="font-semibold tabular-nums">~{rub(t.salaryNow)}</div>
                  </div>
                  <div className="rounded-md bg-ok/12 p-2">
                    <div className="text-xs text-muted-foreground">{RESULTS.tradeoffAfter}</div>
                    <div className="font-semibold tabular-nums" data-testid="tradeoff-gain">~{rub(t.salaryNew)}</div>
                  </div>
                </div>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">{RESULTS.tradeoffSacrifice}</summary>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">{t.sacrifices.map((s) => <li key={s}>{s}</li>)}</ul>
                <p className="mt-1 text-xs text-muted-foreground">{RESULTS.tradeoffNote}</p>
              </details>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <Link href={`/university/${t.universityId}`} className="text-primary hover:underline">{t.universityName}, {t.city}</Link>
                <PlanButton kind="professions" id={t.professionId} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4 pt-6" aria-busy="true" aria-label={RESULTS.loading}>
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    </div>
  );
}
