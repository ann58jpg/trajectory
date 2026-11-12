import { describe, expect, it } from "vitest";
import { computeFunnel, computeStudentFunnel } from "@/lib/funnel";

const row = (session: string, event: string, props: Record<string, unknown> = {}) => ({ ts: "2026-11-12T10:00:00.000Z", session, event, props });

describe("воронки", () => {
  it("студенты: /vibe → начали → закончили → поделились (только карточка вуза)", () => {
    const rows = [row("a", "vibe_open"), row("b", "vibe_open"), row("a", "vibe_test_start"), row("a", "vibe_test_complete"), row("a", "vibe_card_share", { kind: "university" }), row("c", "vibe_card_share", { kind: "applicant" })];
    expect(computeStudentFunnel(rows).map((s) => s.sessions)).toEqual([2, 1, 1, 1]);
  });
  it("избранное считается в шаге «Добавили в избранное»", () => {
    const f = computeFunnel([row("a", "favorite_add"), row("b", "plan_add")]);
    expect(f.steps.find((s) => s.id === "plan_add")!.sessions).toBe(2);
  });
});
