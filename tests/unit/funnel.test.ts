import { describe, expect, it } from "vitest";
import { computeFunnel, type FunnelRow } from "@/lib/funnel";

const row = (session: string, event: string, props: Record<string, unknown> = {}, ts = "2026-10-20T10:00:00.000Z"): FunnelRow => ({ ts, session, event, props });

describe("воронка", () => {
  const rows: FunnelRow[] = [
    row("a", "landing_view"), row("a", "quiz_start"), row("a", "quiz_block_done", { block: "A" }), row("a", "quiz_block_done", { block: "B" }),
    row("a", "quiz_complete"), row("a", "results_view", { mode: "interests" }), row("a", "plan_add"), row("a", "feedback", { rating: 5 }),
    row("b", "landing_view"), row("b", "quiz_start"), row("b", "quiz_block_done", { block: "A" }),
    row("c", "landing_view", {}, "2026-10-21T10:00:00.000Z"), row("c", "landing_view", {}, "2026-10-21T11:00:00.000Z"),
    row("d", "landing_view"), row("d", "quiz_start"), row("d", "quiz_complete"), row("d", "results_view", { mode: "interests" }), row("d", "mode_switch", { to: "money" }), row("d", "feedback", { rating: 3 }),
  ];
  it("уникальные сессии на шагах и конверсии", () => {
    const f = computeFunnel(rows);
    expect(f.steps.find((s) => s.id === "landing_view")!.sessions).toBe(4);
    expect(f.steps.find((s) => s.id === "quiz_start")!.sessions).toBe(3);
    expect(f.conversions.find((c) => c.id === "complete")!.value).toBeCloseTo(2 / 3);
    expect(f.blocks.find((b) => b.block === "B")!.sessions).toBe(1);
    expect(f.feedback.avg).toBe(4);
    expect(f.daily.map((d) => d.date)).toEqual(["2026-10-20", "2026-10-21"]);
  });
  it("фильтр по режиму — по последнему режиму сессии", () => {
    const money = computeFunnel(rows, { mode: "money" });
    expect(money.steps.find((s) => s.id === "results_view")!.sessions).toBe(1);
    expect(money.feedback.avg).toBe(3);
  });
});
