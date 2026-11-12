"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useMarkChapter } from "@/components/app/use-route";
import { TestFirstHint } from "@/components/app/test-first-hint";
import { FavButton } from "@/components/app/fav-button";
import { DataGap } from "@/components/app/data-gap";
import { StoriesList } from "@/components/app/stories-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { useHistory, useProfile } from "@/lib/storage";
import { internshipsFor, LADDER, type Internship } from "@/lib/life";
import type { HhVacancy } from "@/lib/sources/hh-types";
import { CAREER } from "@/lib/copy";
import { track } from "@/lib/analytics";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export function InternshipCard({ p, highlight }: { p: Internship; highlight: boolean }) {
  return (
    <li className={`flex items-start justify-between gap-2 rounded-lg border p-3 text-sm ${highlight ? "border-primary/50 bg-primary/5" : ""}`} data-testid="internship">
      <div className="min-w-0 space-y-0.5">
        <a href={p.url} {...ext} onClick={() => track("internship_open", { id: p.id })} className="inline-flex items-center gap-1 font-medium hover:underline">{p.company} <ExternalLink className="h-3 w-3" /></a>
        <p className="text-xs text-muted-foreground">{CAREER.fromCourse(p.fromCourse)} · {CAREER.selection}: {p.selection ?? CAREER.selectionGap}</p>
        {!p.confirmed && <p className="flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3 w-3" /> {CAREER.unconfirmed}</p>}
      </div>
      <FavButton kind="internships" id={p.id} compact />
    </li>
  );
}

export function ChapterView({ uniNames, areas }: { uniNames: Record<string, string>; areas: Record<string, number | null> }) {
  useMarkChapter(5);
  const [p, , ready] = useProfile();
  const [history] = useHistory();
  const spheres = useMemo(() => history.at(-1)?.spheres ?? [], [history]);
  const list = internshipsFor([]);
  const mine = new Set(internshipsFor(spheres).map((x) => x.id));
  const sorted = [...list].sort((a, b) => Number(mine.has(b.id) && spheres.length > 0) - Number(mine.has(a.id) && spheres.length > 0));
  const [hh, setHh] = useState<HhVacancy[] | null | undefined>(undefined);
  const area = p.regionId ? areas[p.regionId] : null;
  useEffect(() => {
    if (!ready) return;
    fetch(`/api/internships${area ? `?area=${area}` : ""}`).then((r) => r.json()).then((j) => setHh(j.items)).catch(() => setHh(null));
  }, [ready, area]);
  const hhSearch = `https://hh.ru/search/vacancy?${new URLSearchParams({ text: CAREER.hhQuery, experience: "noExperience", ...(area ? { area: String(area) } : {}) })}`;

  return (
    <div className="space-y-6 pt-2" data-testid="chapter-career">
      {!p.consent && <TestFirstHint />}
      <h1 className="text-2xl font-bold sm:text-3xl">{CAREER.title}</h1>
      <p className="text-muted-foreground">{CAREER.lead}</p>

      <section className="space-y-3" data-testid="career-ladder">
        <h2 className="text-lg font-semibold">{CAREER.ladderTitle}</h2>
        <ol className="space-y-3">
          {LADDER.map((r, i) => (
            <li key={r.id} className="relative rounded-xl border bg-card p-4" data-testid="ladder-rung">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{i + 1}. {r.course}</p>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.what}</p>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {r.examples.map((e) => (
                  <li key={e.title}>{e.url ? <a href={e.url} {...ext} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 hover:bg-muted">{e.title} <ExternalLink className="h-3 w-3" /></a> : <span className="inline-flex rounded-full border border-dashed px-3 py-1 text-muted-foreground">{e.title}</span>}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">{CAREER.internshipsTitle}</CardTitle><p className="text-sm text-muted-foreground">{CAREER.internshipsLead}</p></CardHeader>
        <CardContent><ul className="grid gap-2 md:grid-cols-2">{sorted.map((x) => <InternshipCard key={x.id} p={x} highlight={spheres.length > 0 && mine.has(x.id)} />)}</ul></CardContent>
      </Card>

      <Card data-testid="career-hh">
        <CardHeader><CardTitle className="text-base">{CAREER.hhTitle}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {hh === undefined ? <Skeleton className="h-16" /> : hh === null || hh.length === 0 ? <DataGap what={CAREER.hhGapWhat} where={CAREER.hhGapWhere} /> : (
            <ul className="space-y-1.5">{hh.slice(0, 10).map((v) => <li key={v.id}><a href={v.url} {...ext} onClick={() => track("internship_open", { id: `hh:${v.id}` })} className="font-medium hover:underline">{v.name}</a> <span className="text-muted-foreground">· {v.employer} · {v.area}{v.salary ? ` · ${v.salary}` : ""}</span></li>)}</ul>
          )}
          <div className="flex flex-wrap gap-2">
            <a href={hhSearch} {...ext} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 hover:bg-muted">{CAREER.hhSearch} <ExternalLink className="h-3 w-3" /></a>
            <a href="https://career.habr.com/vacancies?qid=1&type=all" {...ext} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 hover:bg-muted">{CAREER.habr} <ExternalLink className="h-3 w-3" /></a>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{CAREER.storiesTitle}</h2>
        <p className="text-sm text-muted-foreground">{CAREER.storiesLead}</p>
        <StoriesList uniNames={uniNames} limit={10} />
      </section>
    </div>
  );
}
