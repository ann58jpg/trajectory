import { describe, expect, it } from "vitest";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { recommend } from "@/lib/engine/recommend";
import { rankRecs } from "@/lib/engine/scoring";
import { buildDirections } from "@/lib/engine/directions";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { RecommendResponse } from "@/lib/schemas";

const { catalog } = validateCatalog(loadRawJson());

function run(id: PersonaId, t: 0 | 1 = 0) {
  const r = recommend(catalog!, PERSONAS[id].profile);
  const ranked = rankRecs(r.recs, t, { moneyMode: t === 1 });
  const dirs = buildDirections(ranked, (c) => (r.specialtyPrograms[c]?.length ?? 0) > 0, { likedGroups: r.likedGroups });
  const unisFor = (prefix: string) => new Set(Object.entries(r.specialtyPrograms).filter(([c]) => c.startsWith(prefix)).flatMap(([, list]) => list.map((p) => p.universityId)));
  return { r, ranked, dirs, unisFor, topIds: ranked.slice(0, 5).map((x) => x.professionId), dirCodes: dirs.top.map((d) => d.code) };
}

describe("персона 5: Соня, Ярославль — театр", () => {
  const x = run("sonya");
  it("ответ проходит схему", () => expect(RecommendResponse.safeParse(x.r).success).toBe(true));
  it("в топ-5 направлений — актёрское, режиссура или театроведение", () => {
    expect(x.dirCodes.some((c) => ["52.05.01", "52.05.02", "52.03.05"].includes(c)), x.dirCodes.join(" ")).toBe(true);
    const shown = x.dirs.top.flatMap((d) => d.recs.map((r) => r.professionId));
    expect(shown.some((p) => ["actor", "theatre_director", "theatre_critic"].includes(p))).toBe(true);
  });
  it("ГИТИС, РГИСИ и Ярославский театральный — среди вузов", () => {
    const unis = x.unisFor("52.");
    for (const u of ["gitis", "rgisi", "ygti"]) expect(unis.has(u), u).toBe(true);
  });
  it("портрет: «в Ярославле»", () => expect(x.r.portrait).toContain("в Ярославле"));
});

describe("персона 6: Даша, Краснодар — животные, не медицина", () => {
  const x = run("dasha");
  it("ветеринария или зоотехния в топ-5, врач — не первый", () => {
    expect(x.topIds.some((p) => ["vet", "zootechnician"].includes(p)), x.topIds.join(" ")).toBe(true);
    expect(x.topIds[0]).not.toBe("doctor");
  });
  it("«медицина не моё» снижает совпадение с врачом", () => {
    const doc = x.r.recs.find((r) => r.professionId === "doctor")!;
    const vet = x.r.recs.find((r) => r.professionId === "vet")!;
    expect(vet.factors.match).toBeGreaterThan(doc.factors.match);
  });
  it("Кубанский ГАУ — среди вузов по ветеринарии", () => expect(x.unisFor("36.").has("kubsau")).toBe(true));
});

describe("персона 7: Марк, Сочи — туризм и гостиницы", () => {
  const x = run("mark");
  it("гостиничное дело или туризм в топ-3", () => {
    expect(x.topIds.slice(0, 3).some((p) => ["hotel_manager", "tourism_manager", "tour_guide"].includes(p)), x.topIds.join(" ")).toBe(true);
  });
  it("Сочинский ГУ и РГУТИС — среди вузов", () => {
    const unis = x.unisFor("43.");
    expect(unis.has("sochisu")).toBe(true);
    expect(unis.has("rguts")).toBe(true);
  });
});

describe("персона 8: Тимур, Казань — госуправление", () => {
  const x = run("timur");
  it("госуправление в топ-5 профессий и направлений", () => {
    expect(x.topIds.some((p) => ["civil_servant", "municipal_manager"].includes(p)), x.topIds.join(" ")).toBe(true);
    expect(x.dirCodes, x.dirCodes.join(" ")).toContain("38.03.04");
  });
  it("КФУ и РАНХиГС — среди вузов по госуправлению", () => {
    const unis = new Set((x.r.specialtyPrograms["38.03.04"] ?? []).map((p) => p.universityId));
    expect(unis.has("kfu")).toBe(true);
    expect(unis.has("ranepa")).toBe(true);
  });
});

describe("персона 9: Лёша, Нижнекамск — химтех и работа на заводе", () => {
  const x = run("lesha");
  it("химическая технология в топ-5 и в направлениях", () => {
    expect(x.topIds, x.topIds.join(" ")).toContain("process_engineer");
    expect(x.dirCodes.some((c) => c.startsWith("18.")), x.dirCodes.join(" ")).toBe(true);
  });
  it("КНИТУ-КХТИ или НХТИ, есть вариант учёбы вместе с работой", () => {
    const progs = Object.entries(x.r.specialtyPrograms).filter(([c]) => c.startsWith("18.")).flatMap(([, l]) => l);
    expect(progs.some((p) => ["knitu", "nchti"].includes(p.universityId))).toBe(true);
    expect(progs.some((p) => p.forms.includes("evening") || p.forms.includes("distance"))).toBe(true);
  });
});
