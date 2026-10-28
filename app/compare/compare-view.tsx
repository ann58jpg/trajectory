"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { OutlookBadge } from "@/components/app/outlook-badge";
import { useCompare, useProfile } from "@/lib/client/storage";
import { RecommendResponse as RecommendResponseSchema, type Rec, type RecommendResponse } from "@/lib/schemas";
import { hasBudget } from "@/lib/engine/exams";
import { yearsWord } from "@/lib/engine/ru";
import { CARD, CHANCE_TEXT, COMMON, COMPARE, MATCH_TEXT, RESULTS } from "@/lib/copy";
import { CHART } from "@/lib/chart-colors";
import { cn, rubK } from "@/lib/utils";
import { track } from "@/lib/analytics";

type Uni = { id: string; name: string; short: string; city: string; dorm: boolean; vuc: boolean; budget: boolean; priceFrom: number | null; priceTo: number | null; employers: number; programs: number };
/** Строка таблицы: значение для показа и число для поиска лучшего (better: больше или меньше лучше). */
type Row<T> = { label: string; show: (x: T) => React.ReactNode; num?: (x: T) => number | null; better?: "max" | "min" };

const CHANCE_NUM = { high: 4, medium: 3, low: 2, risky: 1, unknown: null } as const;

export function CompareView() {
  const [profile, , ready] = useProfile();
  const [items, setItems, itemsReady] = useCompare();
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [unis, setUnis] = useState<Uni[] | null>(null);
  const [error, setError] = useState(false);

  const profIds = items.filter((x) => x.kind === "profession").map((x) => x.id);
  const uniIds = items.filter((x) => x.kind === "university").map((x) => x.id);
  const kind: "profession" | "university" = profIds.length >= 2 || uniIds.length < 2 ? "profession" : "university";

  useEffect(() => {
    if (!ready || !itemsReady) return;
    track("compare_open", { kind, n: kind === "profession" ? profIds.length : uniIds.length });
    if (kind === "university") {
      fetch(`/api/compare?universities=${uniIds.join(",")}`).then((r) => r.json()).then((j) => setUnis(j.universities)).catch(() => setError(true));
      return;
    }
    if (!profile.consent) return;
    fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) })
      .then((r) => r.json())
      .then((j) => {
        const parsed = RecommendResponseSchema.safeParse(j);
        if (parsed.success) setData(parsed.data);
        else setError(true);
      })
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, itemsReady, kind]);

  // без выбора — лучший по интересам против лучшего по доходу
  const picked = profIds.length >= 2;
  const recs = useMemo(() => {
    if (!data) return [];
    const ids = picked ? profIds : [data.comparison.interests?.professionId, data.comparison.money?.professionId].filter((x): x is string => Boolean(x));
    return [...new Set(ids)].map((id) => data.recs.find((r) => r.professionId === id)).filter((r): r is Rec => Boolean(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, picked, profIds.join(",")]);

  const remove = (id: string) => setItems((list) => list.filter((x) => x.id !== id));

  return (
    <div className="space-y-5 pt-6" data-testid="compare-page">
      <Link href="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {COMMON.toResults}</Link>
      <div>
        <h1 className="text-2xl font-bold">{COMPARE.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{kind === "university" || picked ? COMPARE.pickedIntro : COMPARE.defaultIntro}</p>
        {!picked && kind === "profession" && profIds.length === 1 && <p className="mt-1 text-sm text-muted-foreground">{COMPARE.needTwo}</p>}
      </div>
      {error && <p className="text-sm text-bad">{RESULTS.errorTitle}</p>}
      {kind === "profession" && !profile.consent && ready && (
        <Button asChild><Link href="/quiz">{RESULTS.start}</Link></Button>
      )}
      {kind === "profession" && profile.consent && !data && !error && <Skeleton className="h-64" />}
      {kind === "profession" && data && recs.length >= 2 && (
        <>
          <Table
            items={recs}
            head={(r) => <Head href={`/profession/${r.professionId}`} name={r.name} onRemove={picked ? () => remove(r.professionId) : undefined} />}
            rows={professionRows(data)}
          />
          {!picked && data.comparison.interests && data.comparison.money && <Roi data={data} />}
        </>
      )}
      {kind === "university" && !unis && !error && <Skeleton className="h-64" />}
      {kind === "university" && unis && (
        <Table items={unis} head={(u) => <Head href={`/university/${u.id}`} name={u.short} onRemove={() => remove(u.id)} />} rows={UNI_ROWS} />
      )}
    </div>
  );
}

function Head({ href, name, onRemove }: { href: string; name: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-start gap-1">
      <Link href={href} className="font-semibold text-primary hover:underline">{name}</Link>
      {onRemove && <button type="button" onClick={onRemove} className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label={COMPARE.clear}><X className="h-3.5 w-3.5" /></button>}
    </span>
  );
}

function professionRows(d: RecommendResponse): Row<Rec>[] {
  const tuition = (r: Rec) => {
    const b = r.programs[0];
    return !b ? null : hasBudget(b) && b.chance !== "low" && b.chance !== "risky" ? 0 : b.price;
  };
  void d;
  return [
    { label: COMPARE.rows.salary1, show: (r) => rubK(r.salary.junior), num: (r) => r.salary.junior, better: "max" },
    { label: COMPARE.rows.salary3, show: (r) => rubK(Math.round((r.salary.junior + r.salary.middle) / 2000) * 1000), num: (r) => r.salary.junior + r.salary.middle, better: "max" },
    { label: COMPARE.rows.salary5, show: (r) => <b>{rubK(r.salary.middle)}</b>, num: (r) => r.salary.middle, better: "max" },
    { label: COMPARE.rows.match, show: (r) => MATCH_TEXT(r.factors.match), num: (r) => r.factors.match, better: "max" },
    { label: COMPARE.rows.outlook, show: (r) => <OutlookBadge status={r.outlook} />, num: (r) => ({ green: 3, yellow: 2, red: 1 })[r.outlook], better: "max" },
    { label: COMPARE.rows.years, show: (r) => yearsWord(r.years), num: (r) => r.years, better: "min" },
    { label: CARD.chance, show: (r) => (r.programs[0] ? CHANCE_TEXT[r.programs[0].chance] : "—"), num: (r) => (r.programs[0] ? CHANCE_NUM[r.programs[0].chance] : null), better: "max" },
    { label: COMPARE.rows.tuition, show: (r) => { const x = tuition(r); return x === null ? "—" : x === 0 ? COMPARE.budget : COMPARE.perYear(rubK(x)); }, num: tuition, better: "min" },
    { label: COMPARE.rows.early, show: (r) => (r.earlyEntryCourse === null ? "—" : CARD.earlyWork(r.earlyEntryCourse)), num: (r) => (r.earlyEntryCourse === null ? null : -r.earlyEntryCourse), better: "max" },
    { label: COMPARE.rows.remote, show: (r) => COMPARE.remoteText[r.remote], num: (r) => ({ yes: 2, partial: 1, no: 0 })[r.remote], better: "max" },
    { label: COMPARE.rows.exams, show: (r) => r.programs[0]?.exams ?? "—" },
  ];
}

const UNI_ROWS: Row<Uni>[] = [
  { label: COMPARE.rows.city, show: (u) => u.city },
  { label: COMPARE.rows.price, show: (u) => (u.priceFrom ? `${rubK(u.priceFrom)}–${rubK(u.priceTo ?? u.priceFrom)}` : COMPARE.budget), num: (u) => u.priceFrom, better: "min" },
  { label: COMPARE.rows.dorm, show: (u) => (u.dorm ? COMMON.yes : COMMON.no), num: (u) => (u.dorm ? 1 : 0), better: "max" },
  { label: COMPARE.rows.vuc, show: (u) => (u.vuc ? COMMON.yes : COMMON.no), num: (u) => (u.vuc ? 1 : 0), better: "max" },
  { label: COMPARE.rows.rating, show: (u) => `${Math.round(u.employers * 100)}%`, num: (u) => u.employers, better: "max" },
  { label: COMPARE.rows.programs, show: (u) => u.programs, num: (u) => u.programs, better: "max" },
];

function Table<T>({ items, head, rows }: { items: T[]; head: (x: T) => React.ReactNode; rows: Row<T>[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border" data-testid="compare-table">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="p-3 text-left font-medium text-muted-foreground"> </th>
            {items.map((x, i) => <th key={i} className="p-3 text-left align-top">{head(x)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const nums = row.num ? items.map(row.num) : [];
            const valid = nums.filter((v): v is number => v !== null && v !== undefined);
            const differs = valid.length > 1 && new Set(valid).size > 1;
            const best = differs ? (row.better === "min" ? Math.min(...valid) : Math.max(...valid)) : null;
            return (
              <tr key={row.label} className={cn("border-t align-top", differs && "bg-primary/[0.03]")} data-differs={differs || undefined}>
                <td className="p-3 text-muted-foreground">{row.label}</td>
                {items.map((x, i) => (
                  <td key={i} className={cn("p-3", best !== null && nums[i] === best && "bg-ok/12 font-semibold")} data-best={best !== null && nums[i] === best ? "true" : undefined}>
                    {row.show(x)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Roi({ data }: { data: RecommendResponse }) {
  const a = data.comparison.interests!, b = data.comparison.money!;
  const chart = a.roi.map((p, i) => ({ year: p.year, interests: Math.round(p.cumulative / 1000), money: Math.round(b.roi[i].cumulative / 1000) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{COMPARE.roiTitle}</CardTitle>
        <CardDescription>{COMPARE.roiHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="year" tickFormatter={(y) => `${y}`} stroke={CHART.axis} fontSize={12} />
              <YAxis stroke={CHART.axis} fontSize={12} width={56} />
              <Tooltip formatter={(v: number) => COMPARE.thousandsRub(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend formatter={(v) => (v === "interests" ? `${RESULTS.modeInterests}: ${a.name}` : `${RESULTS.modeMoney}: ${b.name}`)} />
              <ReferenceLine y={0} stroke={CHART.axis} />
              <Line type="monotone" dataKey="interests" stroke={CHART.primary} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="money" stroke={CHART.accent} strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
