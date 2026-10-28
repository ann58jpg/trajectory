"use client";
import { CHART } from "@/lib/chart-colors";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Coins, GitCompare, Heart, Info, RefreshCcw, Sparkles, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecCard } from "@/components/app/rec-card";
import { ProgramRow } from "@/components/app/program-row";
import { OutlookBadge } from "@/components/app/outlook-badge";
import { PlanButton } from "@/components/app/plan-button";
import { KEYS, readLS, useProfile, useWeights, writeLS } from "@/lib/client/storage";
import { rankRecs } from "@/lib/engine/scoring";
import type { ComparisonSide, Rec, RecommendResponse, Tradeoff } from "@/lib/schemas";
import { RecommendResponse as RecommendResponseSchema } from "@/lib/schemas";
import { cn, pct, rub, rubK } from "@/lib/utils";
import { z } from "zod";
import { yearsWord } from "@/lib/engine/ru";
import { COMPARE, MATCH_TEXT, RESULTS } from "@/lib/copy";

type State = { status: "idle" | "loading" | "error" | "ok"; data?: RecommendResponse; error?: string; hint?: string };

export function Results() {
  const [profile, , ready] = useProfile();
  const [anchors] = useWeights();
  const [state, setState] = useState<State>({ status: "idle" });
  const [t, setT] = useState<number | null>(null);
  const [tab, setTab] = useState("interests");

  const load = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const json = await res.json();
      if (!res.ok) return setState({ status: "error", error: json.error ?? "Ошибка", hint: json.hint });
      const parsed = RecommendResponseSchema.safeParse(json);
      if (!parsed.success) return setState({ status: "error", error: "Сервер вернул неожиданный ответ", hint: "Обновите страницу" });
      setState({ status: "ok", data: parsed.data });
      const saved = readLS(KEYS.slider, z.number().min(0).max(1), parsed.data.startT);
      setT(saved);
    } catch {
      setState({ status: "error", error: "Нет связи с сервером", hint: "Проверьте, что приложение запущено (npm run dev), и попробуйте ещё раз" });
    }
  };

  useEffect(() => {
    if (ready && profile.consent) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const tv = t ?? state.data?.startT ?? 0.5;
  const setSlider = (v: number) => {
    setT(v);
    writeLS(KEYS.slider, v);
  };

  const ranked = useMemo(() => (state.data ? rankRecs(state.data.recs, tv, { anchors }) : []), [state.data, tv, anchors]);
  const moneyRanked = useMemo(() => (state.data ? rankRecs(state.data.recs, tv, { anchors, moneyMode: true }) : []), [state.data, tv, anchors]);

  if (!ready || state.status === "loading" || (profile.consent && state.status === "idle")) return <ResultsSkeleton />;

  if (!profile.consent) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">Сначала пройди анкету</h1>
        <p className="mt-2 text-muted-foreground">7 минут — и мы покажем профессии, специальности и вузы под твой регион, интересы и деньги.</p>
        <Button asChild size="lg" className="mt-6"><Link href="/quiz">Пройти тест <ArrowRight /></Link></Button>
      </div>
    );
  }

  if (state.status === "error" || !state.data) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center" role="alert">
        <AlertTriangle className="mx-auto h-10 w-10 text-bad" />
        <h1 className="mt-3 text-xl font-bold">{state.error ?? "Не удалось загрузить результаты"}</h1>
        {state.hint && <p className="mt-2 text-sm text-muted-foreground">{state.hint}</p>}
        <Button className="mt-6" onClick={load}><RefreshCcw /> Повторить</Button>
      </div>
    );
  }

  const d = state.data;
  const specName = new Map(d.specialties.map((s) => [s.code, s]));
  const conf = Math.round(d.confidence * 100);

  return (
    <div className="space-y-6 pt-6" data-testid="results">
      {/* Портрет + ползунок */}
      <Card className="hero-bg overflow-hidden">
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col-reverse items-start justify-between gap-2 sm:flex-row sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Твой портрет</p>
              <h1 className="text-lg font-semibold leading-snug sm:text-xl" data-testid="portrait">{d.portrait}</h1>
            </div>
            <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
              <Badge variant={conf >= 80 ? "green" : conf >= 50 ? "yellow" : "red"} data-testid="confidence" title={d.missing.length ? `Не хватает: ${d.missing.join(", ")}` : "Анкета заполнена полностью"}>
                {RESULTS.confidence(conf)}
              </Badge>
              {d.mode === "demo" && <span className="text-[11px] text-muted-foreground">тексты из шаблонов</span>}
            </div>
          </div>
          {d.missing.length > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Пропущено: {d.missing.join(", ")}. <Link href="/quiz" className="text-primary hover:underline">Дополнить анкету</Link>
            </p>
          )}

          <div className="rounded-lg border bg-card/80 p-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary" /> Интерес</span>
              <span className="text-xs text-muted-foreground tabular-nums" data-testid="slider-value">{Math.round((1 - tv) * 100)} / {Math.round(tv * 100)}</span>
              <span className="flex items-center gap-1.5">Доход <Coins className="h-4 w-4 text-accent" /></span>
            </div>
            <Slider value={[Math.round(tv * 100)]} min={0} max={100} step={1} onValueChange={([v]) => setSlider(v / 100)} thumbLabel="Интерес или доход" data-testid="slider" />
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {[[0, "Интересы"], [0.5, "Баланс"], [1, "Деньги"]].map(([v, l]) => (
                <Button key={l as string} size="sm" variant={Math.abs(tv - (v as number)) < 0.01 ? "secondary" : "ghost"} onClick={() => setSlider(v as number)} data-testid={`slider-${v}`}>
                  {l}
                </Button>
              ))}
            </div>
            <p className="mt-1 text-center text-[11px] text-muted-foreground">Рейтинг пересчитывается мгновенно, без перезагрузки.</p>
          </div>
        </CardContent>
      </Card>

      {d.egeAdvice.length > 0 && profile.egeOrder !== "chosen" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Какие предметы ЕГЭ нужны под подходящие профессии</CardTitle></CardHeader>
          <CardContent><ul className="list-inside list-disc space-y-1 text-sm">{d.egeAdvice.map((a) => <li key={a}>{a}</li>)}</ul></CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="interests" data-testid="tab-interests"><Heart /> Интересы</TabsTrigger>
          <TabsTrigger value="money" data-testid="tab-money"><Coins /> Деньги</TabsTrigger>
          <TabsTrigger value="compare" data-testid="tab-compare"><GitCompare /> Сравнение</TabsTrigger>
        </TabsList>

        <TabsContent value="interests" data-testid="panel-interests">
          <InterestsTab ranked={ranked} data={d} t={tv} anchors={anchors} specName={specName} relocationNo={profile.relocation === "no"} />
        </TabsContent>

        <TabsContent value="money" data-testid="panel-money" className="space-y-6">
          {tv < 0.5 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
              Ползунок сейчас ближе к интересам. <Button size="sm" variant="secondary" onClick={() => setSlider(1)}>Сдвинуть на «Деньги»</Button>
            </div>
          )}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Профессии с высоким потолком дохода</h2>
            {moneyRanked.length === 0 && <Empty text="Под твои условия не нашлось профессий с минимальной совместимостью. Попробуй ослабить фильтры в анкете." />}
            <div className="grid gap-3 lg:grid-cols-2">
              {moneyRanked.slice(0, 5).map((r, n) => (
                <div key={r.professionId} className="space-y-2">
                  <RecCard rec={r} t={tv} anchors={anchors} variant="money" rank={n + 1} onlineHint={profile.relocation === "no"} />
                  <p className="px-1 text-xs text-muted-foreground">
                    Специальности:{" "}
                    {r.specialtyCodes.filter((c) => specName.has(c)).slice(0, 4).map((c, k) => (
                      <span key={c}>{k > 0 && ", "}<Link href={`/specialty/${c}`} className="text-primary hover:underline">{c} {specName.get(c)!.name}</Link></span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <TradeoffsBlock tradeoffs={d.tradeoffs} />
        </TabsContent>

        <TabsContent value="compare" data-testid="panel-compare">
          <Comparison a={d.comparison.interests} b={d.comparison.money} />
        </TabsContent>
      </Tabs>

      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground" data-testid="disclaimer">
        Это рекомендации на основе открытых данных, а не гарантия. Проверяй проходные баллы и даты на официальных сайтах вузов.
      </p>
    </div>
  );
}

function InterestsTab({
  ranked, data, t, anchors, specName, relocationNo,
}: {
  ranked: (Rec & { score: number })[]; data: RecommendResponse; t: number; anchors: Parameters<typeof RecCard>[0]["anchors"];
  specName: Map<string, { code: string; name: string; level: string; years: number }>; relocationNo: boolean;
}) {
  const [openSpec, setOpenSpec] = useState<string | null>(null);
  // специальности → профессии: берём лучшие профессии и группируем по специальностям, где для них есть программы
  const groups = useMemo(() => {
    const top = ranked.slice(0, 18);
    const map = new Map<string, { code: string; best: number; recs: (Rec & { score: number })[] }>();
    for (const r of top) {
      const codes = new Set(r.programs.map((p) => p.specialtyCode));
      for (const c of r.specialtyCodes.filter((x) => codes.has(x) || (data.specialtyPrograms[x]?.length ?? 0) > 0)) {
        const g = map.get(c) ?? { code: c, best: 0, recs: [] };
        g.best = Math.max(g.best, r.score);
        if (g.recs.length < 5) g.recs.push(r);
        map.set(c, g);
      }
    }
    return [...map.values()].sort((a, b) => b.best - a.best || b.recs.length - a.recs.length).slice(0, 5);
  }, [ranked, data.specialtyPrograms]);

  if (!ranked.length) return <Empty text="Под твои условия не нашлось подходящих программ. Проверь регион, готовность к переезду и финансы в анкете." />;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Специальности, которые ведут к подходящим тебе профессиям. Нажми «Где учиться», чтобы увидеть программы, прошедшие твои фильтры.</p>
      {groups.map((g, n) => {
        const spec = specName.get(g.code);
        const programs = data.specialtyPrograms[g.code] ?? [];
        return (
          <Card key={g.code} data-testid="specialty-group">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{n + 1}</Badge>
                <Link href={`/specialty/${g.code}`} className="hover:underline"><CardTitle className="text-base sm:text-lg">{g.code} {spec?.name}</CardTitle></Link>
                {spec?.level === "spo" && <Badge variant="secondary">{RESULTS.levelLabel.spo}</Badge>}
              </div>
              <CardDescription>{spec?.level === "spo" ? "После 11 класса" : spec?.level === "specialist" ? "Специалитет" : "Бакалавриат"} · {spec ? yearsWord(spec.years) : ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {g.recs.map((r) => <RecCard key={r.professionId} rec={r} t={t} anchors={anchors} variant="compact" />)}
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenSpec(openSpec === g.code ? null : g.code)} aria-expanded={openSpec === g.code} data-testid="specialty-where">
                Где учиться ({programs.length})
              </Button>
              {openSpec === g.code && (
                <div className="space-y-2" data-testid="specialty-programs">
                  {programs.map((pm) => <ProgramRow key={pm.programId} pm={pm} />)}
                  {relocationNo && <p className="text-xs text-muted-foreground">Ты не готов(а) к переезду — показываем только вузы твоего города и онлайн-программы вузов твоего региона.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TradeoffsBlock({ tradeoffs }: { tradeoffs: Tradeoff[] }) {
  return (
    <section className="space-y-3" data-testid="tradeoffs">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="h-5 w-5 text-primary" /> Если готов изменить…</h2>
      <p className="text-sm text-muted-foreground">Цена компромисса: что нужно поменять, сколько это даст через 5 лет и чем придётся пожертвовать.</p>
      {tradeoffs.length === 0 && (
        <Empty text="Ты уже открыл(а) себе самые денежные варианты под свой профиль — изменения в анкете не дают +25% к доходу." />
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {tradeoffs.map((t) => (
          <Card key={t.professionId + t.programId} className="border-primary/30" data-testid="tradeoff-card">
            <CardContent className="space-y-3 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/profession/${t.professionId}`} className="font-semibold hover:underline">{t.professionName}</Link>
                <Badge variant="green" data-testid="tradeoff-gain">+{Math.round(t.gainPct * 100)}%</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                {t.changes.filter((c) => c.type !== "form").map((c) => (
                  <li key={c.text} className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span className="first-letter:uppercase">{c.text}</span></li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="rounded-md bg-muted/60 p-2">
                  <div className="text-xs text-muted-foreground">сейчас: {t.salaryNowLabel}</div>
                  <div className="font-semibold tabular-nums">~{rub(t.salaryNow)}</div>
                </div>
                <div className="rounded-md bg-ok/12 p-2">
                  <div className="text-xs text-muted-foreground">после изменений</div>
                  <div className="font-semibold tabular-nums">~{rub(t.salaryNew)}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">через 5 лет, в месяц · +{rub(t.gainAbs)} · оценка по данным hh.ru и Росстата</p>
              <div className="text-sm">
                <p className="font-medium">Чем придётся пожертвовать:</p>
                <ul className="list-inside list-disc text-muted-foreground">{t.sacrifices.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <Link href={`/university/${t.universityId}`} className="text-primary hover:underline">{t.universityName}, {t.city}</Link>
                <PlanButton kind="professions" id={t.professionId} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Comparison({ a, b }: { a: ComparisonSide | null; b: ComparisonSide | null }) {
  if (!a || !b) return <Empty text="Недостаточно данных для сравнения — дополни анкету." />;
  const rows: [string, (s: ComparisonSide) => React.ReactNode][] = [
    ["Профессия", (s) => <Link href={`/profession/${s.professionId}`} className="font-semibold text-primary hover:underline">{s.name}</Link>],
    ["Зарплата через 1 год", (s) => rubK(s.salary1)],
    ["через 3 года", (s) => rubK(s.salary3)],
    ["через 5 лет", (s) => <b>{rubK(s.salary5)}</b>],
    ["Срок учёбы", (s) => yearsWord(s.years)],
    [COMPARE.rows.match, (s) => MATCH_TEXT(s.match)],
    ["Перспектива", (s) => <OutlookBadge status={s.outlook} />],
    ["Риски", (s) => <ul className="list-inside list-disc text-left">{s.risks.map((r) => <li key={r}>{r}</li>)}</ul>],
    ["Чем жертвуешь", (s) => (s.sacrifices.length ? <ul className="list-inside list-disc text-left">{s.sacrifices.map((r) => <li key={r}>{r}</li>)}</ul> : "—")],
    ["Стоимость обучения", (s) => (s.tuitionPerYear ? `${rubK(s.tuitionPerYear)}/год` : "бюджет")],
  ];
  const chart = a.roi.map((p, i) => ({ year: p.year, interests: Math.round(p.cumulative / 1000), money: Math.round(b.roi[i].cumulative / 1000) }));
  return (
    <div className="space-y-5" data-testid="comparison">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-3 text-left font-medium text-muted-foreground"> </th>
              <th className="p-3 text-left"><span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary" /> Интересы</span></th>
              <th className="p-3 text-left"><span className="inline-flex items-center gap-1.5"><Coins className="h-4 w-4 text-accent" /> Деньги</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, f]) => (
              <tr key={label} className="border-t align-top">
                <td className="p-3 text-muted-foreground">{label}</td>
                <td className="p-3">{f(a)}</td>
                <td className="p-3">{f(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{COMPARE.roiTitle}</CardTitle>
          <CardDescription>Накопленный доход минус оплата учёбы, тыс. ₽. Оценка: зарплаты растут от старта к уровню «опытный».</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="year" tickFormatter={(y) => `${y} г.`} stroke={CHART.axis} fontSize={12} />
                <YAxis stroke={CHART.axis} fontSize={12} width={56} tickFormatter={(v) => `${v}`} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("ru-RU")} тыс. ₽`} labelFormatter={(y) => `${y}-й год`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend formatter={(v) => (v === "interests" ? `Интересы: ${a.name}` : `Деньги: ${b.name}`)} />
                <ReferenceLine y={0} stroke={CHART.axis} />
                <Line type="monotone" dataKey="interests" stroke={CHART.primary} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="money" stroke={CHART.accent} strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className={cn("rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground")}>{text}</div>;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4 pt-6" aria-busy="true" aria-label="Загрузка результатов">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-11 w-72" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    </div>
  );
}
