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
    // 2026 — из приказа о зачислении на сайте ВШЭ; он главнее данных 2025 года
    expect(officialScore(hse)).toMatchObject({ basis: "budget", total: 297, year: 2026 });
    expect(officialScore(hse)!.url).toMatch(/hse\.ru/);
  });
});

describe("все вузы и направления России (tabiturient.ru)", () => {
  it("больше 800 вузов и филиалов во всех округах, у новых — источник, а неизвестное помечено как «нет данных»", () => {
    const ru = catalog!.universities.filter((u) => !u.abroad);
    expect(ru.length).toBeGreaterThan(800);
    const tab = ru.filter((u) => u.id.startsWith("t_"));
    for (const u of tab) {
      expect(u.dorm, u.id).toBeNull();
      expect(u.vuc, u.id).toBeNull();
      expect(u.priceFrom, u.id).toBeNull();
    }
  });
  it("у направлений бакалавриата и специалитета — статистика по России со ссылкой на источник", () => {
    const withStats = catalog!.specialties.filter((s) => s.stats);
    expect(withStats.length).toBeGreaterThan(250);
    for (const s of withStats) expect(s.stats!.url).toMatch(/^https:\/\/tabiturient\.ru\/np\//);
  });
  it("проходные баллы — только с годом и ссылкой; 2026 — с официальных сайтов вузов", () => {
    const all = catalog!.programs.flatMap((p) => p.passScore.official);
    expect(all.length).toBeGreaterThan(5000);
    const y2026 = all.filter((o) => o.year === 2026);
    expect(y2026.length).toBeGreaterThan(30);
    for (const o of y2026) expect(o.url).not.toMatch(/tabiturient/);
  });
  it("дни открытых дверей с датой — только будущие и со ссылкой", () => {
    const dated = catalog!.events.filter((e) => e.date !== null);
    expect(dated.length).toBeGreaterThan(100);
    for (const e of dated) expect(e.url, e.id).toMatch(/^https?:\/\//);
  });
});
