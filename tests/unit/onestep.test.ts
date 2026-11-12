import { describe, expect, it } from "vitest";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { recommend } from "@/lib/engine/recommend";
import { closeGroups } from "@/lib/engine/tradeoffs";
import { needsSafeChoice } from "@/lib/engine/extras";
import { PERSONAS } from "@/lib/personas";
import { admissionYear } from "@/lib/storage";
import neighbors from "@/data/sphere_neighbors.json";

const { catalog } = validateCatalog(loadRawJson());
if (!catalog) throw new Error("каталог невалиден");
const run = (id: keyof typeof PERSONAS) => recommend(catalog, PERSONAS[id].profile);
const code = (t: { programId: string }) => t.programId.split("__")[1];
const CREATIVE = ["07", "50", "51", "52", "53", "54", "55"];

describe("«Один шаг до…»: строгие правила", () => {
  it("у всех персон: ровно одно изменение, 0–5 вариантов, формат «Один шаг до»", () => {
    for (const id of Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]) {
      const r = run(id);
      expect(r.tradeoffs.length, id).toBeLessThanOrEqual(5);
      for (const t of r.tradeoffs) {
        expect(t.changes.filter((c) => c.type !== "form"), `${id}: ${t.sentence}`).toHaveLength(1);
        expect(t.sentence, id).toMatch(/^Один шаг до /);
      }
    }
  });

  it("соседи групп — только из data/sphere_neighbors.json", () => {
    expect([...closeGroups(["38"])].sort()).toEqual(["01", "38"]);
    for (const [g, list] of Object.entries(neighbors.neighbors)) for (const n of list) expect(n in neighbors.neighbors, `${g}→${n}`).toBe(true);
  });

  it("Дима (экономист): только экономика, финансы, бизнес-информатика и аналитика — ничего творческого и далёкого", () => {
    const r = run("dima");
    for (const t of r.tradeoffs) {
      const c = code(t);
      expect(c.startsWith("38.") || c.startsWith("01.") || c === "09.03.03", `${c}: ${t.sentence}`).toBe(true);
    }
  });

  it("Катя (общество + английский, «проще всего»): безопасный выбор, «Вернуть то, что любил» с дизайном, без далёких направлений", () => {
    const p = PERSONAS.katya.profile;
    expect(needsSafeChoice(p)).toBe(true);
    const r = run("katya");
    expect(r.safeChoice).not.toBeNull();
    expect(r.safeChoice!.alternatives.length).toBeGreaterThanOrEqual(3);
    expect(r.safeChoice!.honest.map((h) => h.code)).toEqual(["38.03.02", "38.03.01"]);
    expect(r.safeChoice!.honest[0].needs.join(" ")).toMatch(/математик/);
    expect(r.safeChoice!.dream.length).toBeGreaterThanOrEqual(5);
    expect(r.returnLoved?.specialties.map((s) => s.code)).toContain("54.03.01");
    for (const t of r.tradeoffs) expect(CREATIVE.includes(code(t).slice(0, 2)), t.sentence).toBe(false);
    for (const t of r.tradeoffs) expect(Number(code(t).slice(0, 2)) < 7 || Number(code(t).slice(0, 2)) > 29, t.sentence).toBe(true);
  });

  it("Вера (9 класс): поступление в 2028, без «Безопасного выбора»", () => {
    expect(admissionYear({ level: "vo", year: null, visited: [] }, "9", new Date("2026-11-12"))).toBe(2028);
    expect(run("vera").safeChoice).toBeNull();
  });

  it("экономисту с профильной математикой «Безопасный выбор» не показываем", () => {
    expect(needsSafeChoice(PERSONAS.dima.profile)).toBe(false);
  });
});
