"use client";
import { CHART } from "@/lib/chart-colors";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useProfile } from "@/lib/client/storage";
import { Skeleton } from "@/components/ui/misc";
import { SourceMark } from "./source-mark";
import { rubK } from "@/lib/utils";

type Market = {
  hhRegion: { found: number; salaryMedian: number | null; url: string; fetchedAt: string } | null;
  hhRF: { found: number; salaryMedian: number | null; url: string; fetchedAt: string } | null;
  seed: { vacanciesRegion: number | null; vacanciesRF: number; trend: number; salaryMiddleRegion: number; meta: { source: string; updatedAt: string; confidence: "verified" | "estimate" } };
};

export function SalaryLadder({ salary, regionCoef }: { salary: { junior: number; middle: number; senior: number; ceiling: number }; regionCoef?: number }) {
  const k = regionCoef ?? 1;
  const data = [
    { name: "Старт", rf: salary.junior, region: Math.round(salary.junior * k) },
    { name: "3–5 лет", rf: salary.middle, region: Math.round(salary.middle * k) },
    { name: "Опытный", rf: salary.senior, region: Math.round(salary.senior * k) },
    { name: "Потолок", rf: salary.ceiling, region: Math.round(salary.ceiling * k) },
  ];
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
          <XAxis dataKey="name" stroke={CHART.axis} fontSize={12} />
          <YAxis stroke={CHART.axis} fontSize={12} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}к`} />
          <Tooltip formatter={(v: number) => rubK(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
          <Bar dataKey="rf" name="Средний регион РФ" fill={CHART.accent} radius={[4, 4, 0, 0]} />
          {regionCoef && <Bar dataKey="region" name="Твой регион" fill={CHART.primary} radius={[4, 4, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarketBlock({ professionId }: { professionId: string }) {
  const [profile, , ready] = useProfile();
  const [m, setM] = useState<Market | null>(null);
  useEffect(() => {
    if (!ready) return;
    fetch(`/api/market?professionId=${professionId}&regionId=${profile.regionId ?? ""}`).then((r) => r.json()).then(setM).catch(() => setM(null));
  }, [ready, professionId, profile.regionId]);
  if (!m) return <Skeleton className="h-24" />;
  const live = m.hhRegion ?? m.hhRF;
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3" data-testid="market-block">
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Вакансий в твоём регионе</p>
        <p className="text-lg font-semibold tabular-nums">
          {m.hhRegion ? m.hhRegion.found.toLocaleString("ru-RU") : m.seed.vacanciesRegion !== null ? `~${m.seed.vacanciesRegion.toLocaleString("ru-RU")}` : "—"}
        </p>
        {m.hhRegion ? <SourceMark source="hh.ru API (вакансии с зарплатой), кэш 24 ч" confidence="verified" updatedAt={m.hhRegion.fetchedAt.slice(0, 10)} /> : <SourceMark source={m.seed.meta.source} confidence="estimate" updatedAt={m.seed.meta.updatedAt} />}
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Вакансий по РФ</p>
        <p className="text-lg font-semibold tabular-nums">{m.hhRF ? m.hhRF.found.toLocaleString("ru-RU") : `~${m.seed.vacanciesRF.toLocaleString("ru-RU")}`}</p>
        <p className="text-xs text-muted-foreground">динамика за год: {m.seed.trend >= 0 ? "+" : ""}{Math.round(m.seed.trend * 100)}% <SourceMark source={m.seed.meta.source} confidence="estimate" /></p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Медиана зарплат в вакансиях</p>
        <p className="text-lg font-semibold tabular-nums">{live?.salaryMedian ? rubK(live.salaryMedian) : `~${rubK(m.seed.salaryMiddleRegion)}`}</p>
        {live?.salaryMedian ? (
          <a href={live.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">открыть вакансии на hh.ru</a>
        ) : (
          <span className="text-xs text-muted-foreground">hh.ru недоступен — оценка из базы <SourceMark source={m.seed.meta.source} confidence="estimate" /></span>
        )}
      </div>
    </div>
  );
}
