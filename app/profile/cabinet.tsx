"use client";
import Link from "next/link";
import { useState } from "react";
import { Bell, Briefcase, CalendarDays, ClipboardList, GraduationCap, History, LogIn, School, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { useRouteInput } from "@/components/app/use-route";
import { FavButton } from "@/components/app/fav-button";
import { CompareToggle } from "@/components/app/compare";
import { MyVibeCard } from "@/components/app/my-vibe-card";
import { InternshipCard } from "@/app/career/view";
import { useCompare, usePlan } from "@/lib/storage";
import { nextStep, readiness } from "@/lib/route";
import { downloadIcs, nextCritical, toIcs } from "@/lib/admission";
import { INTERNSHIPS } from "@/lib/life";
import { CABINET, PLAN } from "@/lib/copy";

type Names = { specialties: Record<string, string>; professions: Record<string, string>; universities: Record<string, string> };

function Section({ icon: Icon, title, children, testid }: { icon: typeof Star; title: string; children: React.ReactNode; testid: string }) {
  return (
    <Card data-testid={testid}>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-5 w-5 text-primary" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

const Empty = ({ text, href, cta }: { text: string; href: string; cta: string }) => (
  <div className="space-y-2 rounded-lg border border-dashed p-3 text-muted-foreground">
    <p>{text}</p>
    <Link href={href} className="font-medium text-primary hover:underline">{cta}</Link>
  </div>
);

export function Cabinet({ names }: { names: Names }) {
  const { ready, input, steps, admission } = useRouteInput();
  const [plan, setPlan] = usePlan();
  const [compare] = useCompare();
  const [loginMsg, setLoginMsg] = useState(false);
  if (!ready) return <Skeleton className="h-64" />;
  const r = readiness(input);
  const next = nextStep(input);
  const history = input.history;
  const done = steps.filter((s) => admission.done.includes(s.id)).length;
  const crit = nextCritical(steps, admission.done);
  const cmpUnis = compare.filter((x) => x.kind === "university");
  const internships = INTERNSHIPS.filter((p) => plan.internships.includes(p.id));
  const critical = steps.filter((s) => s.isCritical && !admission.done.includes(s.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{CABINET.title}</h1>
        <Button variant="outline" onClick={() => setLoginMsg(true)} data-testid="login"><LogIn /> {CABINET.login}</Button>
      </div>
      {loginMsg && <p className="rounded-lg border bg-primary/5 p-3 text-sm" role="status" data-testid="login-soon">{CABINET.loginSoon}</p>}

      {/* 1. Готовность и следующий шаг */}
      <Card className="border-primary/40" data-testid="cab-readiness">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{CABINET.readiness}</p>
            <p className="text-2xl font-bold tabular-nums text-primary" data-testid="readiness">{CABINET.readinessValue(r)}</p>
          </div>
          <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${r}%` }} /></div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{CABINET.next}</p>
            <p className="font-medium">{next.title}</p>
            <p className="text-muted-foreground">{next.text}</p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto"><Link href={next.href}>{next.cta}</Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 2. Результаты теста */}
        <Section icon={History} title={CABINET.test} testid="cab-test">
          {history.length === 0 ? <Empty text={CABINET.noTest} href="/quiz" cta={CABINET.startTest} /> : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><Link href="/results">{CABINET.toResults}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/quiz">{CABINET.retake}</Link></Button>
              </div>
              <p className="font-medium">{CABINET.history}</p>
              <ul className="space-y-1" data-testid="cab-history">{[...history].reverse().slice(0, 5).map((h) => <li key={h.at} className="text-muted-foreground">{CABINET.historyItem(new Date(h.at).toLocaleDateString("ru-RU"), h.vibeType)}</li>)}</ul>
              <MyVibeCard />
            </>
          )}
        </Section>

        {/* 3. Избранные специальности */}
        <Section icon={GraduationCap} title={CABINET.specialties} testid="cab-specialties">
          {plan.specialties.length + plan.professions.length === 0 ? <Empty text={CABINET.emptySpecialties} href="/results" cta={CABINET.toResults} /> : (
            <ul className="space-y-1.5">
              {plan.specialties.map((c) => <li key={c} className="flex items-center justify-between gap-2"><Link href={`/specialty/${c}`} className="hover:underline">{c} {names.specialties[c] ?? ""}</Link><FavButton kind="specialties" id={c} compact /></li>)}
              {plan.professions.map((id) => <li key={id} className="flex items-center justify-between gap-2"><Link href={`/profession/${id}`} className="hover:underline">{names.professions[id] ?? id}</Link><FavButton kind="professions" id={id} compact /></li>)}
            </ul>
          )}
        </Section>
      </div>

      {/* 4. Избранные вузы с заметками и сравнением */}
      <Section icon={School} title={CABINET.unis} testid="cab-unis">
        {plan.universities.length === 0 ? <Empty text={CABINET.emptyUnis} href="/universities" cta={CABINET.catalog} /> : (
          <>
            <ul className="grid gap-3 md:grid-cols-2">
              {plan.universities.map((id) => (
                <li key={id} className="space-y-2 rounded-lg border p-3" data-testid="cab-uni">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/university/${id}`} className="font-medium hover:underline">{names.universities[id] ?? id}</Link>
                    <div className="flex gap-1"><CompareToggle kind="university" id={id} /><FavButton kind="universities" id={id} compact /></div>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">{CABINET.note}</span>
                    <textarea rows={2} maxLength={500} value={plan.notes[id] ?? ""} placeholder={CABINET.notePlaceholder}
                      onChange={(e) => setPlan((p) => ({ ...p, notes: { ...p.notes, [id]: e.target.value } }))}
                      className="w-full rounded-lg border bg-background p-2" data-testid={`note-${id}`} />
                  </label>
                </li>
              ))}
            </ul>
            {cmpUnis.length >= 2 ? <Button asChild variant="outline" size="sm"><Link href="/compare">{CABINET.compare(cmpUnis.length)}</Link></Button> : <p className="text-xs text-muted-foreground">{CABINET.compareHint}</p>}
          </>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 5. Мои события */}
        <Section icon={CalendarDays} title={CABINET.events} testid="cab-events">
          {plan.events.length === 0 ? <Empty text={CABINET.emptyEvents} href="/feed?tab=events" cta={CABINET.catalog} /> : (
            <>
              <ul className="space-y-1.5">{plan.events.map((e) => <li key={e.id}><a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{e.date ? `${new Date(e.date).toLocaleDateString("ru-RU")} · ` : ""}{e.title}</a> <span className="text-muted-foreground">· {names.universities[e.universityId] ?? ""}</span></li>)}</ul>
              {plan.events.some((e) => e.date) && <Button size="sm" variant="outline" onClick={() => downloadIcs(toIcs(plan.events.filter((e) => e.date).map((e) => ({ id: e.id, title: e.title, date: e.date!, url: e.url })), CABINET.events), "events.ics")} data-testid="cab-events-ics"><CalendarDays /> {CABINET.eventsIcs}</Button>}
            </>
          )}
        </Section>

        {/* 6. План поступления */}
        <Section icon={ClipboardList} title={CABINET.plan} testid="cab-plan">
          <p className="font-medium" data-testid="cab-plan-progress">{PLAN.progress(done, steps.length)}</p>
          {crit && <p className="text-muted-foreground">{PLAN.critical(crit.days, crit.step.title)}</p>}
          <Button asChild size="sm"><Link href="/plan">{CABINET.planOpen}</Link></Button>
        </Section>

        {/* 7. Мои стажировки */}
        <Section icon={Briefcase} title={CABINET.internships} testid="cab-internships">
          {internships.length === 0 ? <Empty text={CABINET.emptyInternships} href="/career" cta={CABINET.toCareer} /> : <ul className="space-y-2">{internships.map((p) => <InternshipCard key={p.id} p={p} highlight={false} />)}</ul>}
        </Section>

        {/* 8. Напоминания */}
        <Section icon={Bell} title={CABINET.reminders} testid="cab-reminders">
          <p className="text-muted-foreground">{CABINET.remindersLead}</p>
          <Button size="sm" variant="outline" disabled={critical.length === 0} onClick={() => downloadIcs(toIcs(critical.map((s) => ({ id: s.id, title: s.title, date: s.date, text: s.text })), CABINET.reminders), "reminders.ics")} data-testid="cab-reminders-ics"><CalendarDays /> {CABINET.remindersIcs}</Button>
          <Button size="sm" variant="ghost" disabled className="justify-start"><Bell /> {CABINET.telegram} · {CABINET.soon}</Button>
        </Section>
      </div>
    </div>
  );
}
