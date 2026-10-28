import { describe, expect, it } from "vitest";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { recommend } from "@/lib/engine/recommend";
import { rankRecs } from "@/lib/engine/scoring";
import { buildDirections } from "@/lib/engine/directions";
import { CARDS } from "@/lib/engine/game";
import { StudentProfile } from "@/lib/schemas";

const { catalog } = validateCatalog(loadRawJson());
const groups = [...new Set(catalog!.specialties.map((s) => s.code.slice(0, 2)))].sort();

/** Анкета человека, которому нравятся задачи одной группы и который сдаёт нужные ЕГЭ. */
function profileFor(g: string) {
  const spec = catalog!.specialties.find((s) => s.code.startsWith(g) && s.level !== "spo") ?? catalog!.specialties.find((s) => s.code.startsWith(g))!;
  const subjects = [...new Set(["rus", ...spec.ege.mandatory, ...spec.ege.oneOf.slice(0, 1)])];
  const cards = CARDS.filter((c) => c.group === g);
  return StudentProfile.parse({
    consent: true, start: "interest", moneyHorizon: "long", regionId: "moscow", city: "Москва", relocation: "russia", dorm: "yes",
    finance: "paid", gender: "f", egeOrder: "chosen", ege: subjects.map((s) => ({ subject: s, score: 85 })),
    dviReady: ["art", "stage", "contest", "physical", "written", "interview"], grade: "11",
    game: cards.map((c) => ({ cards: [c.id], pick: c.id })),
  });
}

describe("каждая группа направлений может попасть в топ-10", () => {
  for (const g of groups) {
    it(`группа ${g}`, () => {
      const r = recommend(catalog!, profileFor(g));
      const ranked = rankRecs(r.recs, 0);
      const { top } = buildDirections(ranked, (c) => (r.specialtyPrograms[c]?.length ?? 0) > 0, { limit: 10, perGroup: 3, likedGroups: r.likedGroups });
      expect(top.map((d) => d.group), `топ: ${top.map((d) => d.code).join(" ")}`).toContain(g);
    });
  }
});

describe("выдача без повторов", () => {
  it("профессия встречается в топ-5 направлений один раз, не больше двух направлений из одной группы", () => {
    for (const g of ["09", "31", "38", "52"]) {
      const r = recommend(catalog!, profileFor(g));
      const { top } = buildDirections(rankRecs(r.recs, 0), (c) => (r.specialtyPrograms[c]?.length ?? 0) > 0);
      const ids = top.flatMap((d) => d.recs.map((x) => x.professionId));
      expect(new Set(ids).size).toBe(ids.length);
      const perGroup = new Map<string, number>();
      for (const d of top) perGroup.set(d.group, (perGroup.get(d.group) ?? 0) + 1);
      for (const n of perGroup.values()) expect(n).toBeLessThanOrEqual(2);
    }
  });
});
