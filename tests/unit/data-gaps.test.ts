import { describe, expect, it } from "vitest";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { computeGaps, OWNERS } from "@/lib/data-gaps";

const { catalog } = validateCatalog(loadRawJson());

describe("пробелы в данных", () => {
  it("сводка по всем видам данных, у каждого пробела есть владелец", () => {
    const gaps = computeGaps(catalog!);
    expect(gaps.length).toBeGreaterThanOrEqual(6);
    for (const g of gaps) {
      expect(g.owners.length, g.id).toBeGreaterThan(0);
      expect(g.count).toBeLessThanOrEqual(g.total);
    }
    // все владельцы из правок встречаются: СФР, ФНС, вузы, hh.ru, Минобрнауки, Минтруд
    const used = new Set(gaps.flatMap((g) => g.owners));
    for (const o of Object.keys(OWNERS)) expect(used.has(o as keyof typeof OWNERS), o).toBe(true);
  });

  it("у новых программ нет выдуманных проходных и бюджетных мест", () => {
    const fresh = catalog!.programs.filter((p) => p.meta.source.startsWith("Направление есть в перечне"));
    expect(fresh.length).toBeGreaterThan(1000);
    for (const p of fresh) {
      if (p.passScore.official.length === 0) expect(p.passScore.min, p.id).toBeNull();
      expect(p.budgetPlaces === null || p.budgetPlaces === 0, p.id).toBe(true);
    }
  });
});

describe("официальные проходные баллы", () => {
  it("у каждого есть год, источник, ссылка и дата проверки; шанс считается по официальному баллу", async () => {
    const withOfficial = catalog!.programs.filter((p) => p.passScore.official.length > 0);
    expect(withOfficial.length).toBeGreaterThan(0);
    for (const p of withOfficial)
      for (const o of p.passScore.official) {
        expect([2025, 2026]).toContain(o.year);
        expect(o.url).toMatch(/^https:\/\//);
        expect(o.source.length).toBeGreaterThan(10);
        expect(o.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    const { officialScore } = await import("@/lib/engine/scoring");
    const hse = catalog!.programs.find((p) => p.id === "hse__09.03.04")!;
    expect(officialScore(hse)).toMatchObject({ basis: "budget", total: 299, year: 2025 });
  });
});
