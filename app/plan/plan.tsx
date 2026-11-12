"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, CalendarPlus, Check, ChevronDown, ExternalLink, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Chip } from "@/components/ui/misc";
import { useMarkChapter, useRouteInput } from "@/components/app/use-route";
import { TestFirstHint } from "@/components/app/test-first-hint";
import { CALENDAR_SOURCES, EARLY_START, PATHS, downloadIcs, nextCritical, toIcs, type PathId, type PlanStep } from "@/lib/admission";
import { PLAN } from "@/lib/copy";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export function Plan() {
  useMarkChapter(3);
  const { ready, year, steps, profile, admission, setAdmission } = useRouteInput();
  if (!ready) return null;
  const done = steps.filter((s) => admission.done.includes(s.id)).length;
  const crit = nextCritical(steps, admission.done);
  const toggle = (id: string) => {
    const on = !admission.done.includes(id);
    if (on) track("plan_step_done", { step: id });
    setAdmission((a) => ({ ...a, done: on ? [...a.done, id] : a.done.filter((x) => x !== id) }));
  };
  const togglePath = (id: PathId) =>
    setAdmission((a) => ({ ...a, paths: a.paths.includes(id) ? a.paths.filter((x) => x !== id) : [...a.paths, id] }));
  const ics = () => {
    downloadIcs(toIcs(steps.map((s) => ({ id: s.id, title: `${s.isCritical ? "! " : ""}${s.title}`, date: s.date, text: s.text })), PLAN.icsName), `plan-${year}.ics`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6" data-testid="plan">
      {!profile.consent && <TestFirstHint />}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{PLAN.title}</h1>
        <p className="mt-1 text-muted-foreground">{PLAN.year(year)}. {PLAN.lead}</p>
      </div>

      {profile.grade === "9" && (
        <Card className="border-primary/40" data-testid="early-start">
          <CardContent className="space-y-3 pt-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Rocket className="h-5 w-5 text-primary" /> {PLAN.earlyTitle}</h2>
            <p className="text-sm text-muted-foreground">{PLAN.earlyLead}</p>
            <ol className="space-y-2">
              {EARLY_START.map((s, i) => (
                <li key={s.id} className="flex items-start gap-3 rounded-lg border p-3" data-testid="early-step">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.text}</p>
                    {s.href.startsWith("/") ? (
                      <Link href={s.href} className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">{s.action} <ArrowRight className="h-3.5 w-3.5" /></Link>
                    ) : (
                      <a href={s.href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">{s.action} <ExternalLink className="h-3.5 w-3.5" /></a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold" data-testid="plan-progress">{PLAN.progress(done, steps.length)}</p>
            <Button variant="outline" size="sm" onClick={ics} data-testid="plan-ics"><CalendarPlus /> {PLAN.ics}</Button>
          </div>
          <Progress value={(done / steps.length) * 100} label={PLAN.progress(done, steps.length)} />
          <p className={cn("flex items-center gap-1.5 text-sm", crit ? "text-bad" : "text-muted-foreground")} data-testid="plan-critical">
            {crit && <AlertTriangle className="h-4 w-4" />} {crit ? PLAN.critical(crit.days, crit.step.title) : PLAN.noCritical}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold">{PLAN.pathsTitle}</h2>
        <p className="text-sm text-muted-foreground">{PLAN.pathsHint}</p>
        <div className="flex flex-wrap gap-2" data-testid="plan-paths">
          {PATHS.map((p) => (
            <Chip key={p.id} selected={admission.paths.includes(p.id)} onClick={() => togglePath(p.id)}>{p.label}</Chip>
          ))}
        </div>
      </section>

      {profile.grade === "9" && <h2 className="pt-2 text-lg font-semibold">{PLAN.earlyFull}</h2>}
      <ol className="space-y-3">
        {steps.map((s, i) => <StepCard key={s.id} n={i + 1} s={s} done={admission.done.includes(s.id)} onToggle={() => toggle(s.id)} />)}
      </ol>
    </div>
  );
}

function StepCard({ n, s, done, onToggle }: { n: number; s: PlanStep; done: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const when = s.from ? PLAN.range(fmt(s.from), fmt(s.date)) : PLAN.untilDate(fmt(s.date)) + (s.time ? PLAN.mskTime(s.time) : "");
  return (
    <li id={s.id} className={cn("scroll-mt-20 rounded-xl border bg-card p-4", done && "opacity-70")} data-testid="plan-step" data-step={s.id} data-critical={s.isCritical || undefined}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onToggle} aria-pressed={done} aria-label={PLAN.done}
          className={cn("mt-0.5 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md border-2", done ? "border-primary bg-primary text-primary-foreground" : "border-input")} data-testid="plan-step-done">
          {done && <Check className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{n}.</span>
            <h3 className={cn("font-semibold", done && "line-through")}>{s.title}</h3>
            {s.isCritical && <span className="inline-flex items-center gap-0.5 rounded-full bg-bad/12 px-2 py-0.5 text-xs font-bold text-bad" title={PLAN.criticalBadge} data-testid="critical-badge">! {PLAN.criticalBadge}</span>}
          </div>
          <p className="mt-0.5 text-sm font-medium">{when}</p>
          {!s.confirmed && <p className="text-xs text-warn" data-testid="expected-date">{PLAN.expected}</p>}
          <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          {s.sub.length > 0 && <ul className="mt-2 list-inside list-disc text-sm" data-testid="plan-sub">{s.sub.map((x) => <li key={x}>{x}</li>)}</ul>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {s.href && (s.href.startsWith("/") ? (
              <Button asChild size="sm"><Link href={s.href}>{s.action ?? PLAN.go} <ArrowRight /></Link></Button>
            ) : (
              <Button asChild size="sm"><a href={s.href} target="_blank" rel="noreferrer">{s.action ?? PLAN.go}</a></Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>
              {open ? PLAN.less : PLAN.more} <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
            </Button>
          </div>
          {open && (
            <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm">
              <ul className="list-inside list-disc space-y-1">{s.details.map((d) => <li key={d}>{d}</li>)}</ul>
              <p className="mt-2 text-xs text-muted-foreground">{PLAN.source}: {CALENDAR_SOURCES[s.source] ?? s.source}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
