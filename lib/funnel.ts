/** Воронка по событиям: считаем уникальные сессии на каждом шаге. */
export type FunnelRow = { ts: string; session: string; event: string; props: Record<string, unknown> };

export const FUNNEL_STEPS = [
  { id: "landing_view", label: "Открыли главную" },
  { id: "quiz_start", label: "Начали анкету" },
  { id: "quiz_complete", label: "Закончили анкету" },
  { id: "results_view", label: "Увидели подборку" },
  { id: "engaged", label: "Открыли профессию, вуз или событие" },
  { id: "plan_add", label: "Добавили в план" },
  { id: "report_download", label: "Скачали или отправили отчёт" },
] as const;

export const QUIZ_BLOCKS = ["A", "B", "C", "D", "E"] as const;

/** Формулы конверсий (показываются на странице как есть). */
export const CONVERSIONS = [
  { id: "start", label: "Начали анкету / открыли главную", num: "quiz_start", den: "landing_view" },
  { id: "complete", label: "Закончили анкету / начали", num: "quiz_complete", den: "quiz_start" },
  { id: "results", label: "Увидели подборку / закончили анкету", num: "results_view", den: "quiz_complete" },
  { id: "engaged", label: "Открыли профессию, вуз или событие / увидели подборку", num: "engaged", den: "results_view" },
  { id: "plan", label: "Добавили в план / увидели подборку", num: "plan_add", den: "results_view" },
  { id: "report", label: "Скачали отчёт / увидели подборку", num: "report_download", den: "results_view" },
] as const;

export function computeFunnel(rows: FunnelRow[], opts: { mode?: "interests" | "money" | null } = {}) {
  // режим сессии — с каким режимом человек смотрел подборку последним
  const modeOf = new Map<string, string>();
  for (const r of rows) {
    if (r.event === "results_view" && typeof r.props.mode === "string") modeOf.set(r.session, r.props.mode);
    if (r.event === "mode_switch" && typeof r.props.to === "string") modeOf.set(r.session, r.props.to);
  }
  const use = opts.mode ? rows.filter((r) => modeOf.get(r.session) === opts.mode) : rows;
  const sessions = (pred: (r: FunnelRow) => boolean) => new Set(use.filter(pred).map((r) => r.session)).size;
  const counts: Record<string, number> = {
    landing_view: sessions((r) => r.event === "landing_view"),
    quiz_start: sessions((r) => r.event === "quiz_start"),
    quiz_complete: sessions((r) => r.event === "quiz_complete"),
    results_view: sessions((r) => r.event === "results_view"),
    engaged: sessions((r) => ["profession_open", "university_open", "event_click", "compare_open"].includes(r.event)),
    plan_add: sessions((r) => r.event === "plan_add"),
    report_download: sessions((r) => r.event === "report_download" || r.event === "report_share"),
  };
  const conversions = CONVERSIONS.map((c) => ({ ...c, value: counts[c.den] ? counts[c.num] / counts[c.den] : null }));
  // где уходят из анкеты: сколько сессий закончили каждый блок
  const blocks = QUIZ_BLOCKS.map((b) => ({ block: b, sessions: sessions((r) => r.event === "quiz_block_done" && r.props.block === b) }));
  const ratings = use.filter((r) => r.event === "feedback" && typeof r.props.rating === "number").map((r) => r.props.rating as number);
  const days = new Map<string, Record<string, Set<string>>>();
  for (const r of use) {
    if (!["landing_view", "quiz_start", "quiz_complete", "results_view"].includes(r.event)) continue;
    const d = r.ts.slice(0, 10);
    const day = days.get(d) ?? {};
    (day[r.event] ??= new Set()).add(r.session);
    days.set(d, day);
  }
  const daily = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, ev]) => ({
    date, landing_view: ev.landing_view?.size ?? 0, quiz_start: ev.quiz_start?.size ?? 0, quiz_complete: ev.quiz_complete?.size ?? 0, results_view: ev.results_view?.size ?? 0,
  }));
  return {
    steps: FUNNEL_STEPS.map((s) => ({ ...s, sessions: counts[s.id] })),
    conversions,
    blocks,
    feedback: { count: ratings.length, avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null },
    daily,
  };
}
