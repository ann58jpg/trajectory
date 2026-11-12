"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Briefcase, ClipboardList, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { useAdmission, usePlan, useProfile, useSettings, admissionYear } from "@/lib/storage";
import { buildPlan } from "@/lib/admission";
import { INTERNSHIPS } from "@/lib/life";
import type { UniEvent } from "@/lib/schemas";
import { FEED } from "@/lib/copy";
import { InternshipCard } from "../career/view";

type Tab = "all" | "events" | "internships" | "admission";
type Ev = UniEvent & { universityShort: string };

export function FeedView({ tab }: { tab: Tab }) {
  const [plan, , ready] = usePlan();
  const [profile] = useProfile();
  const [settings] = useSettings();
  const [adm] = useAdmission();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const ids = plan.universities.join(",");
  useEffect(() => {
    if (!ready) return;
    fetch(`/api/feed${ids ? `?ids=${ids}` : ""}`).then((r) => r.json()).then((j) => setEvents(j.events)).catch(() => setEvents([]));
  }, [ready, ids]);
  const steps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return buildPlan(admissionYear(settings, profile.grade), profile, adm.paths).filter((s) => !adm.done.includes(s.id) && s.date >= today).slice(0, 4);
  }, [settings, profile, adm]);
  const tabs: Tab[] = ["all", "events", "internships", "admission"];
  const show = (t: Tab) => tab === "all" || tab === t;
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label={FEED.title} data-testid="feed-tabs">
        {tabs.map((t) => (
          <Link key={t} href={t === "all" ? "/feed" : `/feed?tab=${t}`} scroll={false} aria-current={tab === t ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid={`feed-tab-${t}`}>{FEED.tabs[t]}</Link>
        ))}
      </nav>
      {ready && <p className="text-sm text-muted-foreground">{ids ? FEED.forFav : FEED.noFav}</p>}

      {show("admission") && steps.length > 0 && (
        <section className="space-y-2" data-testid="feed-admission">
          <h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4 text-primary" /> {FEED.tabs.admission}</h2>
          <ul className="space-y-1.5">{steps.map((s) => <li key={s.id}><Link href={`/plan#${s.id}`} className="block rounded-lg border bg-card p-3 text-sm hover:bg-muted">{FEED.admissionItem(new Date(s.date).toLocaleDateString("ru-RU"), s.title)}</Link></li>)}</ul>
        </section>
      )}

      {show("events") && (
        <section className="space-y-2" data-testid="feed-events">
          <h2 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> {FEED.tabs.events}</h2>
          {!events ? <Skeleton className="h-24" /> : events.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{FEED.empty}</p> : (
            <ul className="space-y-1.5">
              {events.slice(0, tab === "events" ? 40 : 8).map((e) => (
                <li key={e.id} className="rounded-lg border bg-card p-3 text-sm" data-testid="feed-event">
                  <p className="font-medium">{e.date && new Date(e.date).toLocaleDateString("ru-RU")}{e.time ? `, ${e.time}` : ""} · <Link href={`/university/${e.universityId}`} className="hover:underline">{e.universityShort}</Link></p>
                  <p>{e.title}</p>
                  <a href={e.sourceUrl ?? e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{FEED.source} <ExternalLink className="h-3 w-3" /></a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {show("internships") && (
        <section className="space-y-2" data-testid="feed-internships">
          <h2 className="flex items-center gap-2 font-semibold"><Briefcase className="h-4 w-4 text-primary" /> {FEED.tabs.internships}</h2>
          <ul className="grid gap-2 md:grid-cols-2">{INTERNSHIPS.slice(0, tab === "internships" ? 20 : 4).map((p) => <InternshipCard key={p.id} p={p} highlight={false} />)}</ul>
        </section>
      )}
    </div>
  );
}
