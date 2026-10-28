import { describe, expect, it } from "vitest";
import { CARDS, CARD_BY_ID, GAME_ROUNDS, OPENING_ROUNDS, SPHERES, gameSummary, nextRoundCards, simulateGame } from "@/lib/engine/game";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { buildUserModel } from "@/lib/engine/profile";
import { matchScore } from "@/lib/engine/scoring";
import { emptyProfile } from "@/lib/schemas";

const { catalog } = validateCatalog(loadRawJson());

describe("игра «Что бы ты делал(а) завтра на работе?»", () => {
  it("не меньше 120 карточек, покрыты все 56 групп направлений", () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(120);
    expect(new Set(CARDS.map((c) => c.group)).size).toBe(56);
    const profIds = new Set(catalog!.professions.map((p) => p.id));
    for (const c of CARDS) expect(profIds.has(c.professionId), c.id).toBe(true);
  });

  it("первые 5 раундов показывают все сферы, в раунде 2–3 карточки", () => {
    const rounds = simulateGame(() => false);
    expect(rounds.length).toBe(GAME_ROUNDS);
    const first = rounds.slice(0, OPENING_ROUNDS).flatMap((r) => r.cards.map((id) => CARD_BY_ID.get(id)!.sphere));
    expect(new Set(first)).toEqual(new Set(SPHERES.map((s) => s.id)));
    for (const r of rounds) {
      expect(r.cards.length).toBeGreaterThanOrEqual(2);
      expect(r.cards.length).toBeLessThanOrEqual(3);
    }
    // карточки не повторяются
    const all = rounds.flatMap((r) => r.cards);
    expect(new Set(all).size).toBe(all.length);
  });

  it("после 5 раундов подстраивается под выбранные сферы", () => {
    const rounds = simulateGame((c) => c.sphere === "med");
    const later = rounds.slice(OPENING_ROUNDS).flatMap((r) => r.cards.map((id) => CARD_BY_ID.get(id)!.sphere));
    expect(later.filter((s) => s === "med").length / later.length).toBeGreaterThan(0.6);
    expect(gameSummary(rounds).spheres[0]).toBe("Медицина");
  });

  it("раунды детерминированы: после перезагрузки те же карточки", () => {
    const rounds = simulateGame((c) => c.sphere === "art");
    expect(nextRoundCards(rounds.slice(0, 7))).toEqual(rounds[7].cards);
  });

  it("выбранные задачи поднимают совпадение с профессией", () => {
    const vet = catalog!.professions.find((p) => p.id === "vet")!;
    const base = emptyProfile();
    const played = { ...base, game: simulateGame((c) => c.sphere === "nature") };
    const m0 = buildUserModel(base, catalog!.egeSubjects, catalog!.regions);
    const m1 = buildUserModel(played, catalog!.egeSubjects, catalog!.regions);
    expect(matchScore(vet, m1).match).toBeGreaterThan(matchScore(vet, m0).match + 0.15);
  });
});

describe("«Как ты хочешь работать?»", () => {
  it("15 вариантов, все профессии размечены только ими", async () => {
    const { WORK_FORMATS } = await import("@/lib/engine/vocab");
    expect(WORK_FORMATS.length).toBe(15);
    const ids = new Set(WORK_FORMATS.map((f) => f.id));
    for (const p of catalog!.professions) {
      expect(p.workFormats.length, p.id).toBeGreaterThan(0);
      for (const f of p.workFormats) expect(ids.has(f), `${p.id}: ${f}`).toBe(true);
    }
  });

  it("выбор «вахтой» поднимает вахтовые профессии выше офисных", () => {
    const p = { ...emptyProfile(), workFormats: ["shift"] };
    const m = buildUserModel(p, catalog!.egeSubjects, catalog!.regions);
    const shift = catalog!.professions.filter((x) => x.workFormats.includes("shift"));
    const office = catalog!.professions.filter((x) => !x.workFormats.includes("shift"));
    const avg = (arr: typeof shift) => arr.reduce((s, x) => s + matchScore(x, m).match, 0) / arr.length;
    expect(avg(shift)).toBeGreaterThan(avg(office) + 0.1);
  });
});
