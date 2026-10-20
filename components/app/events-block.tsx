"use client";
import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { usePlan } from "@/lib/client/storage";
import type { UniEvent } from "@/lib/schemas";

const TYPE: Record<UniEvent["type"], string> = {
  open_day: "День открытых дверей", lecture: "Открытая лекция", olympiad: "Олимпиада", hackathon: "Хакатон",
  school: "Школа абитуриента", festival: "Фестиваль", club: "Клубы и студжизнь", excursion: "Экскурсия",
};
const FORMAT = { online: "онлайн", offline: "офлайн", mixed: "офлайн + онлайн" } as const;

type Resp = { events: UniEvent[]; regular: UniEvent[]; source: "ai" | "seed"; eventsUrl: string };

export function EventsBlock({ universityId }: { universityId: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(false);
  const [plan, setPlan, ready] = usePlan();
  useEffect(() => {
    fetch(`/api/events?universityId=${encodeURIComponent(universityId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr(true));
  }, [universityId]);

  if (err) return <p className="text-sm text-muted-foreground">Мероприятия сейчас не загрузились — загляни на сайт вуза.</p>;
  if (!data) return <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;

  const add = (e: UniEvent) =>
    setPlan((p) => (p.events.some((x) => x.id === e.id) ? { ...p, events: p.events.filter((x) => x.id !== e.id) } : { ...p, events: [...p.events, { id: e.id, title: e.title, url: e.url, date: e.date, universityId: e.universityId, done: false }] }));

  const Item = ({ e }: { e: UniEvent }) => {
    const inPlan = ready && plan.events.some((x) => x.id === e.id);
    return (
      <li className="rounded-lg border p-3 text-sm" data-testid="event-item">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{e.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="secondary">{TYPE[e.type]}</Badge>
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{e.date ? new Date(e.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : e.when}</span>
              <span>· {FORMAT[e.format]}</span>
            </div>
          </div>
          <Button size="sm" variant={inPlan ? "secondary" : "outline"} onClick={() => add(e)} aria-pressed={inPlan}>
            {inPlan ? <Check /> : <Plus />} {inPlan ? "В плане" : "В чек-лист"}
          </Button>
        </div>
        <p className="mt-2 text-muted-foreground">{e.why}</p>
        <a href={e.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline" data-testid="event-link">
          {e.source === "ai" ? "Страница события" : "Страница событий вуза"} <ExternalLink className="h-3 w-3" />
        </a>
      </li>
    );
  };

  return (
    <div className="space-y-3" data-testid="events-block">
      <p className="text-xs text-muted-foreground">
        {data.source === "ai"
          ? "Свежие события на ближайшие 60 дней — найдены ИИ-поиском по сайту и соцсетям вуза. Даты сверяй по ссылке."
          : "Демо-режим: даты не выдумываем — показываем, какие события вуз обычно проводит, и ссылку на его официальную страницу."}
      </p>
      <ul className="space-y-2">{data.events.map((e) => <Item key={e.id} e={e} />)}</ul>
      {data.regular.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Регулярные события вуза</summary>
          <ul className="mt-2 space-y-2">{data.regular.map((e) => <Item key={e.id} e={e} />)}</ul>
        </details>
      )}
    </div>
  );
}
