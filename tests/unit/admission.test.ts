import { describe, expect, it } from "vitest";
import { buildPlan, nextCritical, toIcs } from "@/lib/admission";
import { chapters, nextStep } from "@/lib/route";
import { emptyProfile, StudentProfile } from "@/lib/schemas";
import { AdmissionSchema, PlanSchema, SettingsSchema, admissionYear } from "@/lib/storage";

const base = emptyProfile();

describe("план поступления", () => {
  it("2027: 10 главных шагов, критические сроки отмечены, даты из календаря", () => {
    const s = buildPlan(2027, base, []);
    expect(s.length).toBe(10);
    expect(s.filter((x) => x.isCritical).map((x) => x.id).sort()).toEqual(["apply", "consent", "ege_choice", "essay"].sort());
    const consent = s.find((x) => x.id === "consent")!;
    expect(consent.date).toBe("2027-08-05");
    expect(consent.time).toBe("12:00");
    expect(s.find((x) => x.id === "ege_choice")!.date).toBe("2027-02-01");
  });
  it("2028: те же шаги на год позже, все даты — ожидаемые", () => {
    const s = buildPlan(2028, base, []);
    expect(s.find((x) => x.id === "consent")!.date).toBe("2028-08-05");
    expect(s.every((x) => !x.confirmed)).toBe(true);
  });
  it("военная кафедра и творческий экзамен добавляют шаги, пути — только подшаги", () => {
    const p = StudentProfile.parse({ vucImportant: "yes", dviReady: ["art"] });
    const s = buildPlan(2027, p, ["target", "olympiad"]);
    expect(s.map((x) => x.id)).toContain("medical");
    expect(s.map((x) => x.id)).toContain("creative");
    expect(s.length).toBeLessThanOrEqual(12);
    const plain = buildPlan(2027, p, []);
    expect(s.length).toBe(plain.length);
    expect(s.find((x) => x.id === "apply")!.sub.length).toBe(2);
  });
  it("до ближайшей критической даты и календарь .ics", () => {
    const s = buildPlan(2027, base, []);
    const c = nextCritical(s, [], new Date("2026-11-12T10:00:00Z"))!;
    expect(c.step.id).toBe("essay");
    expect(c.days).toBe(20);
    const ics = toIcs(s.map((x) => ({ id: x.id, title: x.title, date: x.date })), "План");
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(10);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270805");
  });
  it("год поступления по классу", () => {
    const st = SettingsSchema.parse({});
    const now = new Date("2026-11-12");
    expect(admissionYear(st, "11", now)).toBe(2027);
    expect(admissionYear(st, "10", now)).toBe(2028);
    expect(admissionYear({ ...st, year: 2028 }, "11", now)).toBe(2028);
  });
});

describe("«Маршрут»", () => {
  const input = (over: Partial<Parameters<typeof chapters>[0]> = {}) => ({
    profile: base, history: [], plan: PlanSchema.parse({}), admission: AdmissionSchema.parse({}),
    steps: buildPlan(2027, base, []), settings: SettingsSchema.parse({}), ...over,
  });
  it("без теста следующий шаг — тест, все главы «не начато»", () => {
    expect(nextStep(input()).href).toBe("/quiz");
    expect(chapters(input()).every((c) => c.status === "todo")).toBe(true);
  });
  it("после теста — выбрать вузы, потом — шаг плана", () => {
    const h = [{ at: "2026-11-01", vibeType: null, spheres: [], portrait: "" }];
    expect(nextStep(input({ history: h })).href).toBe("/results");
    const plan = PlanSchema.parse({ universities: ["hse", "msu", "spbu"] });
    const n = nextStep(input({ history: h, plan }), new Date("2026-11-12"));
    expect(n.title).toBe("Определиться со сферой и профессией");
    expect(chapters(input({ history: h, plan }))[1].status).toBe("done");
  });
});
