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
