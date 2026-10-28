import { describe, expect, it } from "vitest";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { recommend } from "@/lib/engine/recommend";
import { rankRecs, scoreRec } from "@/lib/engine/scoring";
import { weightsAt, WEIGHT_ANCHORS } from "@/lib/engine/config";
import { buildUserModel, parseDreamKeywords } from "@/lib/engine/profile";
import { egeCheck } from "@/lib/engine/filters";
import { accusativeCity, genitiveCity, prepositionalCity } from "@/lib/engine/ru";
import { PERSONAS } from "@/lib/personas";
import { StudentProfile, RecommendResponse } from "@/lib/schemas";

const { catalog, errors } = validateCatalog(loadRawJson());
if (!catalog) throw new Error(errors.join("\n"));

const run = (id: keyof typeof PERSONAS) => recommend(catalog, PERSONAS[id].profile);
const top = (r: ReturnType<typeof run>, t: number, n = 6, money = false) => rankRecs(r.recs, t, { moneyMode: money }).slice(0, n);

describe("данные", () => {
  it("объём справочников соответствует ТЗ", () => {
    expect(catalog.regions.length).toBeGreaterThanOrEqual(20);
    expect(catalog.specialties.length).toBeGreaterThanOrEqual(30);
    expect(catalog.professions.length).toBeGreaterThanOrEqual(50);
    expect(catalog.universities.length).toBeGreaterThanOrEqual(40);
    expect(new Set(catalog.universities.map((u) => u.city)).size).toBeGreaterThanOrEqual(12);
  });
  it("у каждой профессии есть статус перспективы с обоснованием и источником", () => {
    for (const p of catalog.professions) {
      expect(["green", "yellow", "red"]).toContain(p.outlook.status);
      expect(p.outlook.reason.length).toBeGreaterThan(20);
      expect(p.outlook.source.length).toBeGreaterThan(3);
    }
  });
  it("у каждой цифры есть источник и уровень достоверности", () => {
    for (const p of catalog.professions) expect(p.salary.meta.source).toBeTruthy();
    for (const p of catalog.programs) expect(["verified", "estimate"]).toContain(p.passScore.meta.confidence);
    for (const r of catalog.regions) expect(r.meta.source).toBeTruthy();
  });
  it("вузы из вопроса 18 присутствуют", () => {
    const need = ["msu", "hse", "ranepa", "mgimo", "rea", "rnimu", "mipt", "sechenov", "bmstu", "msal", "kosygin", "gubkin", "rudn", "fa", "mephi", "rub", "umich"];
    for (const id of need) expect(catalog.universities.some((u) => u.id === id)).toBe(true);
    expect(catalog.universities.find((u) => u.id === "rub")?.abroad).toBe(true);
  });
  it("в seed нет выдуманных дат мероприятий", () => {
    expect(catalog.events.every((e) => e.date === null)).toBe(true);
  });
});

describe("веса и ползунок", () => {
  it("крайние положения совпадают с профилями ТЗ, середина — с базовой формулой", () => {
    expect(weightsAt(0)).toEqual(WEIGHT_ANCHORS.interests);
    expect(weightsAt(1)).toEqual(WEIGHT_ANCHORS.money);
    const mid = weightsAt(0.5);
    expect(mid.demand).toBeCloseTo(0.3);
    expect(mid.income).toBeCloseTo(0.25);
    expect(mid.employment).toBeCloseTo(0.2);
    expect(mid.priority).toBeCloseTo(0.15);
    expect(mid.match).toBeCloseTo(0.1);
  });
  it("сумма весов всегда 1", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const w = weightsAt(t);
      expect(w.demand + w.income + w.employment + w.priority + w.match).toBeCloseTo(1);
    }
  });
  it("score монотонен по фактору дохода при t=1", () => {
    const base = { factors: { demand: 0.5, income: 0.4, employment: 0.5, priority: 0.5, match: 0.5 }, bonus: 0 };
    const richer = { ...base, factors: { ...base.factors, income: 0.9 } };
    expect(scoreRec(richer, 1)).toBeGreaterThan(scoreRec(base, 1));
  });
});

describe("анкета → модель", () => {
  it("«нравится из-за учителя» весит меньше, чем «интересно само по себе»", () => {
    const a = buildUserModel(StudentProfile.parse({ subjectLikes: { bio: ["teacher"] } }), catalog.egeSubjects, catalog.regions);
    const b = buildUserModel(StudentProfile.parse({ subjectLikes: { bio: ["intrinsic"] } }), catalog.egeSubjects, catalog.regions);
    expect(a.tags.get("biology")!.weight).toBeLessThan(b.tags.get("biology")!.weight);
    const c = buildUserModel(StudentProfile.parse({ subjectLikes: { bio: ["grades_no_like"] } }), catalog.egeSubjects, catalog.regions);
    expect(c.tags.get("biology")!.weight).toBeLessThan(a.tags.get("biology")!.weight);
  });
  it("разбор свободного текста по ключевым словам", () => {
    const r = parseDreamKeywords("Хочу собирать дроны и зарабатывать много денег");
    expect(r.tags).toContain("drones");
    expect(r.values).toContain("доход");
  });
  it("пропущенные ответы снижают уверенность", () => {
    const empty = recommend(catalog, StudentProfile.parse({}));
    expect(empty.confidence).toBeLessThan(0.2);
    expect(empty.missing.length).toBeGreaterThan(5);
    expect(run("anya").confidence).toBeGreaterThan(0.9);
  });
  it("ЕГЭ: творческое испытание не блокирует, нехватка профильного предмета — блокирует", () => {
    const design = catalog.specialties.find((s) => s.code === "54.03.01")!;
    const ege = new Map<string, number | null>([["rus", 80], ["lit", 80], ["soc", 70]]);
    expect(egeCheck(design, ege).ok).toBe(true);
    const cs = catalog.specialties.find((s) => s.code === "09.03.04")!;
    expect(egeCheck(cs, ege).ok).toBe(false);
  });
  it("падежи городов", () => {
    expect(genitiveCity("Самара")).toBe("Самары");
    expect(genitiveCity("Сызрань")).toBe("Сызрани");
    expect(genitiveCity("Новосибирск")).toBe("Новосибирска");
    expect(genitiveCity("Махачкала")).toBe("Махачкалы");
    expect(accusativeCity("Казань")).toBe("Казань");
    expect(accusativeCity("Самара")).toBe("Самару");
    expect(prepositionalCity("Сызрань")).toBe("Сызрани");
    expect(prepositionalCity("Москва")).toBe("Москве");
  });
});

describe("персона 1: Аня, Москва", () => {
  const r = run("anya");
  it("ответ проходит zod-схему API", () => {
    expect(RecommendResponse.safeParse(r).success).toBe(true);
  });
  it("в «Интересах» — дизайн, медиа, издательское дело, UX", () => {
    const names = top(r, 0, 8).map((x) => x.professionId);
    const creative = ["uxui", "graphic_designer", "editor", "illustrator", "smm", "video_editor", "copywriter", "journalist", "designer_3d"];
    expect(names.filter((n) => creative.includes(n)).length).toBeGreaterThanOrEqual(5);
    expect(names.slice(0, 3).some((n) => ["uxui", "graphic_designer", "editor"].includes(n))).toBe(true);
  });
  it("только вузы Москвы (переезд не нужен)", () => {
    for (const rec of top(r, 0, 10)) for (const p of rec.programs) expect(p.city === "Москва" || p.online).toBe(true);
  });
  it("портрет учитывает пол", () => {
    expect(r.portrait).toContain("Не хочешь переезжать.");
    expect(r.portrait).toContain("Готова долго учиться");
  });
});

describe("персона 2: Артём, Сызрань", () => {
  const r = run("artem");
  it("во вкладке «Интересы» нет ни одного вуза вне Самарской области", () => {
    for (const t of [0, 0.5, 1]) {
      for (const rec of rankRecs(r.recs, t)) for (const p of rec.programs) expect(p.regionId).toBe("samara");
    }
    for (const list of Object.values(r.specialtyPrograms)) for (const p of list) expect(p.regionId).toBe("samara");
  });
  it("учитывает ранний вход и вечернюю/дуальную форму", () => {
    const t = top(r, r.startT, 8);
    expect(t.filter((x) => x.earlyEntryCourse !== null && x.earlyEntryCourse <= 2).length).toBeGreaterThanOrEqual(4);
    expect(t.some((x) => x.bonusNotes.some((n) => /вечерн|дуальн|онлайн/.test(n)))).toBe(true);
  });
  it("только бюджет", () => {
    for (const rec of rankRecs(r.recs, 0)) for (const p of rec.programs) expect(p.budgetPlaces).toBeGreaterThan(0);
  });
  it("в «Деньгах» есть компромисс с переездом в Самару/Казань и выигрышем в ₽ и %", () => {
    const reloc = r.tradeoffs.filter((t) => t.changes.some((c) => c.type === "relocate") && ["Самара", "Казань", "Тольятти"].includes(t.city));
    expect(reloc.length).toBeGreaterThan(0);
    expect(reloc[0].gainAbs).toBeGreaterThan(0);
    expect(reloc[0].gainPct).toBeGreaterThanOrEqual(0.25);
    expect(reloc[0].sentence).toMatch(/₽/);
    expect(reloc[0].sentence).toMatch(/\+\d+%/);
  });
});

describe("персона 3: Камила, Дагестан", () => {
  const r = run("kamila");
  it("медицина в топе «Интересов»", () => {
    const ids = top(r, 0, 4).map((x) => x.professionId);
    expect(ids).toContain("doctor");
  });
  it("все вузы вне Махачкалы — с общежитием", () => {
    const uni = new Map(catalog.universities.map((u) => [u.id, u]));
    for (const rec of rankRecs(r.recs, 0)) for (const p of rec.programs) if (p.city !== "Махачкала" && !p.online) expect(uni.get(p.universityId)!.dorm).toBe(true);
  });
  it("честный шанс поступления: в Сеченовский и РНИМУ шанс не выше среднего", () => {
    const doctor = r.recs.find((x) => x.professionId === "doctor")!;
    const all = r.specialtyPrograms["31.05.01"] ?? [];
    const sech = all.find((p) => p.universityId === "sechenov");
    if (sech) expect(["low", "risky", "medium"]).toContain(sech.chance);
    expect(doctor.programs.length).toBeGreaterThan(0);
  });
  it("есть альтернативы: биотехнологии / фармацевтика", () => {
    const ids = top(r, 0, 15).map((x) => x.professionId);
    expect(ids.some((x) => x === "biotechnologist" || x === "pharmacist")).toBe(true);
  });
});

describe("персона 4: Илья, Новосибирск", () => {
  const r = run("ilya");
  it("только вузы с ВУЦ и очной формой", () => {
    const uni = new Map(catalog.universities.map((u) => [u.id, u]));
    for (const rec of rankRecs(r.recs, 1)) for (const p of rec.programs) {
      expect(uni.get(p.universityId)!.vuc).toBe(true);
      expect(p.forms).toContain("full");
    }
  });
  it("в «Деньгах» — ИТ и инженерия", () => {
    const ids = top(r, 1, 5, true).map((x) => x.professionId);
    const it_ = ["data_scientist", "data_engineer", "backend", "security", "devops", "frontend", "mobile_dev", "product_manager", "chip_designer"];
    expect(ids.filter((x) => it_.includes(x)).length).toBeGreaterThanOrEqual(4);
  });
  it("у junior-разработки учтён риск ИИ (статус не зелёный)", () => {
    const backend = r.recs.find((x) => x.professionId === "backend")!;
    expect(backend.outlook).not.toBe("green");
    expect(backend.outlookReason).toMatch(/ИИ/);
  });
  it("местный вуз первым у топ-профессии", () => {
    expect(top(r, 1, 1, true)[0].programs[0].city).toBe("Новосибирск");
  });
});

describe("ползунок даёт заметно разные списки", () => {
  it("для всех персон топ-5 при t=0 и t=1 различаются", () => {
    for (const id of Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]) {
      const r = run(id);
      const a = top(r, 0, 5).map((x) => x.professionId);
      const b = top(r, 1, 5, true).map((x) => x.professionId);
      const overlap = a.filter((x) => b.includes(x)).length;
      expect(overlap, id).toBeLessThanOrEqual(4);
      expect(a.join(), id).not.toBe(b.join());
    }
  });
  it("Аня: при t=1 средняя зарплата топ-5 выше, чем при t=0", () => {
    const r = run("anya");
    const avg = (xs: { salary: { middle: number } }[]) => xs.reduce((s, x) => s + x.salary.middle, 0) / xs.length;
    expect(avg(top(r, 1, 5, true))).toBeGreaterThan(avg(top(r, 0, 5)));
  });
});
