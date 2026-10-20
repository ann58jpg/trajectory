import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, Landmark, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCatalog } from "@/lib/db/catalog";
import { OutlookBadge } from "@/components/app/outlook-badge";
import { SourceMark } from "@/components/app/source-mark";
import { PlanButton } from "@/components/app/plan-button";
import { ProfilePrograms } from "@/components/app/profile-programs";
import { ExplainBlock } from "@/components/app/explain-block";
import { MarketBlock, SalaryLadder } from "@/components/app/market-block";
import { pct } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getCatalog().professions.find((x) => x.id === id);
  return { title: p ? `${p.name} — Траектория` : "Профессия не найдена" };
}

export default async function ProfessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCatalog();
  const prof = c.professions.find((x) => x.id === id);
  if (!prof) notFound();
  const specs = prof.specialties.map((code) => c.specialties.find((s) => s.code === code)!).filter(Boolean);
  const prios = prof.priorities.map((pid) => c.priorities.find((x) => x.id === pid)!).filter(Boolean);
  const similar = prof.similar.map((sid) => c.professions.find((x) => x.id === sid)!).filter(Boolean);

  return (
    <div className="space-y-6 pt-6" data-testid="profession-page">
      <Link href="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> К результатам</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{prof.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <OutlookBadge status={prof.outlook.status} reason={prof.outlook.reason} />
            {prof.earlyEntryCourse !== null && <Badge variant="secondary">работать можно с {prof.earlyEntryCourse} курса</Badge>}
            <Badge variant="outline">удалёнка: {prof.remote === "yes" ? "да" : prof.remote === "partial" ? "частично" : "нет"}</Badge>
          </div>
        </div>
        <PlanButton kind="professions" id={prof.id} size="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Чем занимается</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="space-y-1.5">{prof.tasks.map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t}</li>)}</ul>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 font-medium"><Wrench className="h-4 w-4" /> Навыки и технологии</p>
              <div className="flex flex-wrap gap-1.5">
                {prof.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                {prof.stack.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="outlook-card">
          <CardHeader><CardTitle className="text-base">Прогноз на 5 лет</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <OutlookBadge status={prof.outlook.status} />
            <p>{prof.outlook.reason}</p>
            <p className="flex items-center gap-1.5 text-muted-foreground"><Bot className="h-4 w-4" /> Риск автоматизации ИИ: <b>{pct(prof.aiRisk)}</b></p>
            {prios.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 font-medium"><Landmark className="h-4 w-4" /> Госприоритеты</p>
                <ul className="list-inside list-disc text-muted-foreground">{prios.map((p) => <li key={p.id} title={p.source}>{p.name}</li>)}</ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Источник: {prof.outlook.source}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Зарплатная лестница, ₽ в месяц</CardTitle>
          <p className="text-xs text-muted-foreground">Средний регион РФ; в твоём регионе — с поправочным коэффициентом. <SourceMark source={prof.salary.meta.source} confidence={prof.salary.meta.confidence} updatedAt={prof.salary.meta.updatedAt} /></p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SalaryLadder salary={prof.salary} />
          <MarketBlock professionId={prof.id} />
        </CardContent>
      </Card>

      <ExplainBlock entityType="profession" entityId={prof.id} />

      <Card>
        <CardHeader><CardTitle className="text-base">Через какие специальности</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {specs.map((s) => (
            <Link key={s.code} href={`/specialty/${s.code}`} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted" data-testid="profession-specialty-link">
              <span className="font-medium">{s.code}</span> {s.name} <span className="text-xs text-muted-foreground">· трудоустройство {pct(s.employment.rate)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <ProfilePrograms professionId={prof.id} />

      <Card>
        <CardHeader><CardTitle className="text-base">Похожие профессии</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {similar.map((s) => (
            <Link key={s.id} href={`/profession/${s.id}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              {s.name} <OutlookBadge status={s.outlook.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
