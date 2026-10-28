"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Check, Clock, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { usePlan } from "@/lib/client/storage";
import type { UniEvent } from "@/lib/schemas";
import { EVENTS } from "@/lib/copy";
import { track } from "@/lib/analytics";
import { DataGap } from "./data-gap";

const TYPE = EVENTS.types;
const FORMAT = EVENTS.format;

type Resp = { events: UniEvent[]; regular: UniEvent[]; source: "ai" | "seed"; eventsUrl: string };

const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });

/** Одно мероприятие: дата и время, формат, ссылка, совет «зачем идти», кнопка «В мой план». */
export function EventItem({ e, uniName }: { e: UniEvent; uniName?: string }) {
  const [plan, setPlan, ready] = usePlan();
  const inPlan = ready && plan.events.some((x) => x.id === e.id);
  const add = () => {
    if (!inPlan) track("plan_add", { kind: "event", id: e.id });
    setPlan((p) => (p.events.some((x) => x.id === e.id) ? { ...p, events: p.events.filter((x) => x.id !== e.id) } : { ...p, events: [...p.events, { id: e.id, title: e.title, url: e.url, date: e.date, universityId: e.universityId, done: false }] }));
  };
  return (
    <li className="rounded-lg border p-3 text-sm" data-testid="event-item" data-date={e.date ?? ""}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{e.title}</p>
          {uniName && <p className="text-xs text-muted-foreground">{uniName}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">{TYPE[e.type]}</Badge>
            {e.date ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground" data-testid="event-date"><CalendarDays className="h-3 w-3" />{fmtDate(e.date)}</span>
            ) : (
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{e.when}</span>
            )}
            {e.time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{e.time}</span>}
            <span>· {FORMAT[e.format]}</span>
          </div>
        </div>
        <Button size="sm" variant={inPlan ? "secondary" : "outline"} onClick={add} aria-pressed={inPlan} data-testid="event-plan">
          {inPlan ? <Check /> : <Plus />} {inPlan ? EVENTS.added : EVENTS.add}
        </Button>
      </div>
      <p className="mt-2 text-muted-foreground">{e.why}</p>
      <a href={e.url} target="_blank" rel="noopener noreferrer" onClick={() => track("event_click", { id: e.id })} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline" data-testid="event-link">
        {e.date ? EVENTS.link : EVENTS.linkVuz} <ExternalLink className="h-3 w-3" />
      </a>
    </li>
  );
}

/** Дайджест событий вуза: сначала будущие с датой (ближайшие первыми), потом регулярные без даты. */
export function EventsBlock({ universityId }: { universityId: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`/api/events?universityId=${encodeURIComponent(universityId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr(true));
  }, [universityId]);

  if (err) return <p className="text-sm text-muted-foreground">{EVENTS.error}</p>;
  if (!data) return <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;

  const today = new Date().toISOString().slice(0, 10);
  const all = [...data.events, ...data.regular].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);
  const dated = all.filter((e) => e.date !== null && e.date >= today).sort((a, b) => a.date!.localeCompare(b.date!));
  const regular = all.filter((e) => e.date === null);

  return (
    <div className="space-y-3" data-testid="events-block">
      {dated.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">{data.source === "ai" ? EVENTS.aiNote : EVENTS.datedNote}</p>
          <ul className="space-y-2" data-testid="events-dated">{dated.map((e) => <EventItem key={e.id} e={e} />)}</ul>
        </>
      ) : (
        <DataGap what={EVENTS.dateGapWhat} where={EVENTS.dateGapWhere} />
      )}
      {regular.length > 0 && (
        <details className="text-sm" open={dated.length === 0}>
          <summary className="cursor-pointer text-muted-foreground">{EVENTS.regular}</summary>
          <p className="mt-1 text-xs text-muted-foreground">{EVENTS.seedNote}</p>
          <ul className="mt-2 space-y-2">{regular.map((e) => <EventItem key={e.id} e={e} />)}</ul>
        </details>
      )}
    </div>
  );
}
