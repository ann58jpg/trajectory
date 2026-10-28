"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckSquare, Printer, Square, Star, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutlookBadge } from "@/components/app/outlook-badge";
import { usePlan, useProfile } from "@/lib/client/storage";
import { ADMISSION_STAGES, COMMON, OUTLOOK_TEXT, PLAN } from "@/lib/copy";
import { track } from "@/lib/analytics";
import type { Outlook, Rec, RecommendResponse } from "@/lib/schemas";
import { rubK, cn } from "@/lib/utils";

type Props = {
  professions: { id: string; name: string; specialties: string[]; outlook: Outlook; outlookReason: string; tasks: string[] }[];
  universities: { id: string; short: string; city: string; admissionUrl: string; eventsUrl: string }[];
  programs: { id: string; universityId: string; specialtyCode: string; name: string; passMin: number | null; passMax: number | null; budget: number; price: number | null }[];
  specialties: { code: string; name: string; level: string; mandatory: string[]; oneOf: string[] }[];
  subjects: Record<string, string>;
};

export function Plan({ professions, universities, programs, specialties, subjects }: Props) {
  const [plan, setPlan, ready] = usePlan();
  const [profile, , pReady] = useProfile();
  const [recs, setRecs] = useState<Map<string, Rec>>(new Map());
  const [portrait, setPortrait] = useState<string>("");
  const [parents, setParents] = useState(false);

  useEffect(() => {
    if (!pReady || !profile.consent) return;
    fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: RecommendResponse) => {
        setRecs(new Map(d.recs.map((r) => [r.professionId, r])));
        setPortrait(d.portrait);
      })
      .catch(() => {});
  }, [pReady, profile]);

  const myProfs = professions.filter((p) => plan.professions.includes(p.id));
  const myUnis = universities.filter((u) => plan.universities.includes(u.id) || programs.some((p) => plan.programs.includes(p.id) && p.universityId === u.id));
  const myPrograms = programs.filter((p) => plan.programs.includes(p.id));
  const userSubjects = new Set(profile.ege.map((e) => e.subject));
  const uniName = (id: string) => universities.find((u) => u.id === id)?.short ?? id;

  // ЕГЭ под цель: что нужно и чего не хватает
  const egeNeeds = useMemo(() => {
    const out: { target: string; need: string[]; missing: string[] }[] = [];
    const specOf = (code: string) => specialties.find((s) => s.code === code);
    const targets = [
      ...myProfs.map((p) => ({ label: p.name, codes: p.specialties })),
      ...myPrograms.map((p) => ({ label: `${uniName(p.universityId)}: ${p.name}`, codes: [p.specialtyCode] })),
    ];
    for (const t of targets) {
      const spec = t.codes.map(specOf).find((s) => s && s.level !== "spo");
      if (!spec) continue;
      const need = [...spec.mandatory.map((s) => subjects[s] ?? s), ...(spec.oneOf.length ? [spec.oneOf.map((s) => subjects[s] ?? s).join(" / ")] : [])];
      const missing = [
        ...spec.mandatory.filter((s) => !userSubjects.has(s)).map((s) => subjects[s] ?? s),
        ...(spec.oneOf.length && !spec.oneOf.some((s) => userSubjects.has(s)) ? [spec.oneOf.map((s) => subjects[s] ?? s).join(" или ")] : []),
      ];
      out.push({ target: `${t.label} (${spec.code})`, need, missing });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, profile, specialties]);

  if (!ready) return null;
  const empty = !myProfs.length && !myUnis.length && !plan.events.length;
  const toggleEvent = (id: string) => setPlan((p) => ({ ...p, events: p.events.map((e) => (e.id === id ? { ...e, done: !e.done } : e)) }));
  const remove = (kind: "professions" | "universities" | "programs", id: string) => setPlan((p) => ({ ...p, [kind]: p[kind].filter((x) => x !== id) }));
  const print = () => {
    track("report_download", { view: parents ? "parents" : "plan" });
    window.print();
  };

  if (parents) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pt-6" data-testid="parents-view">
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setParents(false)}><X /> {COMMON.close}</Button>
          <Button onClick={print}><Printer /> {PLAN.print}</Button>
        </div>
        <h1 className="text-2xl font-bold">{PLAN.parentsTitle}</h1>
        {portrait && <p className="text-muted-foreground">{portrait}</p>}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{PLAN.parentsProfessions}</h2>
          {myProfs.map((p) => {
            const r = recs.get(p.id);
            return (
              <div key={p.id} className="rounded-lg border p-4 text-sm" data-testid="parents-profession">
                <p className="font-semibold">{p.name} <OutlookBadge status={p.outlook} /></p>
                {r && (
                  <ul className="mt-1 list-inside list-disc text-muted-foreground">
                    <li>{PLAN.parentsSalary(rubK(r.salary.junior), rubK(r.salary.middle), rubK(r.salary.senior), r.salary.regionName)}</li>
                    <li>{PLAN.parentsDemand(r.vacancies.toLocaleString("ru-RU"), `${r.vacanciesTrend >= 0 ? "+" : ""}${Math.round(r.vacanciesTrend * 100)}%`)}</li>
                    <li>{PLAN.parentsOutlook(`${OUTLOOK_TEXT[p.outlook]}. ${p.outlookReason}`)}</li>
                    {r.earlyEntryCourse !== null && <li>{PLAN.parentsEarly(r.earlyEntryCourse)}</li>}
                  </ul>
                )}
                <p className="mt-2 font-medium">{PLAN.parentsTasks}</p>
                <ul className="list-inside list-disc text-muted-foreground" data-testid="parents-tasks">{p.tasks.slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            );
          })}
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{PLAN.parentsUnis}</h2>
          <ul className="list-inside list-disc text-sm">
            {myPrograms.map((p) => (
              <li key={p.id}>
                {uniName(p.universityId)} — {p.name}
                {p.passMin !== null && `: ${PLAN.passApprox(`${p.passMin}–${p.passMax ?? p.passMin}`)} (${COMMON.estimate})`}, {PLAN.budgetPlaces(p.budget)}
                {p.price ? `, ${rubK(p.price)} ${COMMON.perYear}` : ""}
              </li>
            ))}
            {myUnis.filter((u) => !myPrograms.some((p) => p.universityId === u.id)).map((u) => <li key={u.id}>{u.short} ({u.city})</li>)}
          </ul>
        </section>
        <p className="text-xs text-muted-foreground">{PLAN.parentsNote}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-6" data-testid="plan">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Star className="h-6 w-6 text-warn" /> {PLAN.title}</h1>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" onClick={print} data-testid="print"><Printer /> {PLAN.print}</Button>
          <Button
            onClick={() => {
              setParents(true);
              track("report_share", { view: "parents" });
            }}
            disabled={empty}
            data-testid="parents"
          >
            <Users /> {PLAN.parents}
          </Button>
        </div>
      </div>

      {empty && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {PLAN.empty}
          <div className="mt-4"><Button asChild><Link href="/results">{COMMON.toResults}</Link></Button></div>
        </div>
      )}

      {myProfs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{PLAN.professions}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {myProfs.map((p) => {
              const r = recs.get(p.id);
              return (
                <div key={p.id} className="space-y-2 rounded-lg border p-3 text-sm" data-testid="plan-profession">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/profession/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5"><OutlookBadge status={p.outlook} />{r && <span className="text-xs text-muted-foreground">{rubK(r.salary.middle)} {COMMON.perMonth}</span>}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="no-print h-8 w-8" aria-label={COMMON.remove} onClick={() => remove("professions", p.id)}><Trash2 /></Button>
                  </div>
                  <ul className="list-inside list-disc text-xs text-muted-foreground">{p.tasks.slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(myUnis.length > 0 || myPrograms.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">{PLAN.unis}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {myPrograms.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <Link href={`/university/${p.universityId}`} className="font-medium hover:underline">{uniName(p.universityId)}</Link> — {p.name}
                  <p className="text-xs text-muted-foreground">
                    {p.passMin !== null && `${PLAN.passApprox(`${p.passMin}–${p.passMax ?? p.passMin}`)} (${COMMON.estimate}) · `}{PLAN.budgetPlaces(p.budget)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="no-print h-8 w-8" aria-label={COMMON.remove} onClick={() => remove("programs", p.id)}><Trash2 /></Button>
              </div>
            ))}
            {myUnis.filter((u) => plan.universities.includes(u.id)).map((u) => (
              <div key={u.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <Link href={`/university/${u.id}`} className="font-medium hover:underline">{u.short}</Link> <span className="text-muted-foreground">· {u.city}</span>
                  <p className="text-xs"><a href={u.admissionUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{PLAN.admission}</a></p>
                </div>
                <Button variant="ghost" size="icon" className="no-print h-8 w-8" aria-label={COMMON.remove} onClick={() => remove("universities", u.id)}><Trash2 /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {egeNeeds.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{PLAN.ege}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {egeNeeds.map((e) => (
              <div key={e.target} className="rounded-lg border p-3">
                <p className="font-medium">{e.target}</p>
                <p className="text-muted-foreground">{PLAN.egeNeed(e.need.join(", "))}</p>
                {e.missing.length > 0 ? <p className="text-bad">{PLAN.egeMissing(e.missing.join(", "))}</p> : <p className="text-ok">{PLAN.egeOk}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {plan.events.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{PLAN.events}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {plan.events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <button type="button" onClick={() => toggleEvent(e.id)} aria-label={e.done ? PLAN.markUndone : PLAN.markDone} className="mt-0.5 cursor-pointer">
                  {e.done ? <CheckSquare className="h-5 w-5 text-ok" /> : <Square className="h-5 w-5" />}
                </button>
                <div className={cn("flex-1", e.done && "line-through opacity-60")}>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {uniName(e.universityId)} · {e.date ? new Date(e.date).toLocaleDateString("ru-RU") : PLAN.dateOnSite} ·{" "}
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{PLAN.link}</a>
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="no-print h-8 w-8" aria-label={COMMON.remove} onClick={() => setPlan((p) => ({ ...p, events: p.events.filter((x) => x.id !== e.id) }))}><Trash2 /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="print-break">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" /> {PLAN.stagesTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">{PLAN.stagesHint}</p>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-3 border-l pl-5 text-sm">
            {ADMISSION_STAGES.filter((s) => s.for !== "11" || profile.grade !== "9").map((s) => (
              <li key={s.what}>
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                <Badge variant="secondary">{s.when}</Badge>
                <p className="mt-1">{s.what}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
