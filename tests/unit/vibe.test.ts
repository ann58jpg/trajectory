import { describe, expect, it } from "vitest";
import { aggregate, demoAnswers, DEMO_UNIS, MIN_ANSWERS, radar, vibeMatch, vibeType, type ApplicantVibe } from "@/lib/vibe";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { recommend } from "@/lib/engine/recommend";
import { StudentProfile } from "@/lib/schemas";

const { catalog } = validateCatalog(loadRawJson());

describe("вайб вуза", () => {
  it("показывается только от 10 ответов", () => {
    const a = demoAnswers("msu");
    expect(a.length).toBeGreaterThanOrEqual(MIN_ANSWERS);
    expect(aggregate("msu", a.slice(0, 9))).toBeNull();
    const v = aggregate("msu", a)!;
    expect(v.count).toBe(a.length);
    for (const s of Object.values(v.ordinal)) expect(s.dist.reduce((x, y) => x + y, 0)).toBe(a.length);
    expect(v.tags.length).toBeLessThanOrEqual(5);
    expect(v.leisure.length).toBeLessThanOrEqual(5);
  });
  it("демо — 30 вузов; у ВШЭ ровно 9 ответов, вайб появляется на 10-м", () => {
    expect(DEMO_UNIS.length).toBe(30);
    const hse = demoAnswers("hse");
    expect(hse.length).toBe(9);
    expect(aggregate("hse", hse)).toBeNull();
    expect(aggregate("hse", [...hse, { ...hse[0], faculty: "ФКН" }])).not.toBeNull();
    expect(demoAnswers("t_unknown")).toEqual([]);
  });
  it("совпадение по вайбу: похожий профиль ближе, чем противоположный", () => {
    const v = aggregate("x", Array.from({ length: 10 }, () => ({ universityId: "x", faculty: "", course: 1, ordinal: { discipline: [2], load: [0], extra: [2], work: [2], atmosphere: [2], campus: [2] }, leisure: ["clubs" as const], spirit: ["science" as const], tags: [] })))!;
    const near: ApplicantVibe = { ordinal: { discipline: 2, load: 0, extra: 2, work: 2, atmosphere: 2, campus: 2 }, leisure: ["clubs"], spirit: ["science"] };
    const far: ApplicantVibe = { ordinal: { discipline: 0, load: 2, extra: 0, work: 0, atmosphere: 0, campus: 0 }, leisure: ["sport"], spirit: ["career"] };
    expect(vibeMatch(near, v)).toBeGreaterThan(0.9);
    expect(vibeMatch(far, v)).toBeLessThan(0.2);
    expect(radar(near, v)).toHaveLength(8);
    expect(vibeType(near).title).toBe("Свободный исследователь");
  });
  it("вайб — отдельный фактор в подборе: меняет счёт программы", () => {
    const p = StudentProfile.parse({ consent: true, regionId: "moscow", city: "Москва", relocation: "no", ege: [{ subject: "rus", score: 80 }, { subject: "math", score: 80 }, { subject: "inf", score: 80 }], egeOrder: "chosen",
      vibe: { ordinal: { discipline: 2, load: 1, extra: 2, work: 1, atmosphere: 2, campus: 1 }, leisure: ["clubs"], spirit: ["science"] } });
    const vibes = new Map([["hse", aggregate("hse", [...demoAnswers("hse"), demoAnswers("hse")[0]])!]]);
    const without = recommend(catalog!, p);
    const withV = recommend(catalog!, p, "demo", { vibes, vibeWeight: 0.5 });
    const find = (r: typeof without) => Object.values(r.specialtyPrograms).flat().find((x) => x.universityId === "hse");
    expect(find(withV)?.vibeMatch).not.toBeNull();
    expect(find(without)?.vibeMatch).toBeNull();
  });
});
