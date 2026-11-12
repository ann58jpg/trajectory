import { describe, expect, it } from "vitest";
import { ALUMNI_META, INTERNSHIPS, LADDER, alumniOf, internshipsFor, studentLifeOf } from "@/lib/life";
import { DEMO_UNIS } from "@/lib/vibe";
import { StoryInput, storyLine } from "@/lib/stories";

describe("студенческая жизнь, карьера, выпускники", () => {
  it("у каждого факта есть источник", () => {
    for (const id of DEMO_UNIS) {
      const l = studentLifeOf(id);
      expect(l, id).not.toBeNull();
      for (const c of l!.communities) expect(c.source).toMatch(/^https:\/\/www\.wikidata\.org\//);
      for (const t of l!.typical) { expect(t.source).toMatch(/^https:\/\//); expect(t.month).toBeGreaterThanOrEqual(1); }
      for (const p of alumniOf(id)?.people ?? []) { expect(p.source).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/); expect(p).not.toHaveProperty("photo"); }
    }
    expect(ALUMNI_META.source).toContain("P69");
  });

  it("выпускники: 30 вузов, у большинства от 5 человек, не больше 10", () => {
    const counts = DEMO_UNIS.map((id) => alumniOf(id)?.people.length ?? 0);
    expect(counts.filter((n) => n >= 5).length).toBeGreaterThanOrEqual(25);
    expect(Math.max(...counts)).toBeLessThanOrEqual(10);
  });

  it("стажировки: нужные компании, у всех ссылка и источник", () => {
    const names = INTERNSHIPS.map((p) => p.company).join(" ");
    for (const c of ["Яндекс", "Сбер", "Т-Банк", "VK", "Ozon", "Росатом", "РЖД", "Газпром нефть", "Альфа"]) expect(names).toContain(c);
    for (const p of INTERNSHIPS) { expect(p.url).toMatch(/^https:\/\//); expect(p.source.length).toBeGreaterThan(3); expect(p.fromCourse).toBeGreaterThanOrEqual(1); }
    expect(internshipsFor(["law"]).map((p) => p.id)).toContain("gov");
    expect(internshipsFor(["law"]).map((p) => p.id)).not.toContain("yandex");
  });

  it("лестница по курсам: 1 курс → после выпуска, 2–4 примера", () => {
    expect(LADDER.map((r) => r.id)).toEqual(["c1", "c2", "c3", "c5"]);
    for (const r of LADDER) { expect(r.examples.length).toBeGreaterThanOrEqual(2); expect(r.examples.length).toBeLessThanOrEqual(4); }
  });

  it("история выпускника: согласие обязательно, формат строки", () => {
    const base = { universityId: "kfu", specialty: "Экономика", gradYear: 2021, age: 27, sphere: "банк", position: "аналитик", salary: "s120", city: "Казань", advice: "Учи SQL", name: "Маша", anonymous: false };
    expect(StoryInput.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(StoryInput.safeParse({ ...base, consent: true }).success).toBe(true);
    expect(storyLine(base, "КФУ")).toBe("Маша, 27 лет. Экономика в КФУ → аналитик (банк), Казань.");
    expect(storyLine({ ...base, anonymous: true, age: 22 }, "КФУ")).toMatch(/^Выпускник, 22 года\./);
  });
});
