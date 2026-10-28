import { describe, expect, it } from "vitest";
import { loadRawJson } from "@/lib/data/load-json";
import { validateCatalog } from "@/lib/data/validate";
import { StudentProfile } from "@/lib/schemas";
import { buildUserModel } from "@/lib/engine/profile";
import { computeAllPrograms } from "@/lib/engine/scoring";
import { egeCheck, examSetText } from "@/lib/engine/exams";
import { recommend } from "@/lib/engine/recommend";

const { catalog } = validateCatalog(loadRawJson());
if (!catalog) throw new Error("каталог невалиден");
const spec = (code: string) => catalog.specialties.find((s) => s.code === code)!;

describe("ЕГЭ и доп. экзамены", () => {
  it("русский есть у всех, даже если его не отметили", () => {
    const m = buildUserModel(StudentProfile.parse({ ege: [{ subject: "math", score: 80 }] }), catalog.egeSubjects, catalog.regions);
    expect(m.ege.has("rus")).toBe(true);
  });

  it("без балла по русскому шанс поступления не считается", () => {
    const base = { consent: true, regionId: "moscow", city: "Москва", relocation: "no" as const, egeOrder: "chosen" as const };
    const noRus = StudentProfile.parse({ ...base, ege: [{ subject: "rus", score: null }, { subject: "math", score: 90 }, { subject: "inf", score: 90 }] });
    const withRus = StudentProfile.parse({ ...base, ege: [{ subject: "rus", score: 90 }, { subject: "math", score: 90 }, { subject: "inf", score: 90 }] });
    const pm = (p: StudentProfile) => computeAllPrograms({ catalog, profile: p, model: buildUserModel(p, catalog.egeSubjects, catalog.regions) }).get("bmstu__09.03.01")!;
    expect(pm(noRus).chance).toBe("unknown");
    expect(pm(withRus).userSum).toBe(270);
    expect(pm(withRus).chance).not.toBe("unknown");
  });

  it("базовая математика не заменяет профильную, и мы говорим об этом прямо", () => {
    const ege = new Map<string, number | null>([["rus", 80], ["math_base", 5], ["phys", 70]]);
    const c = egeCheck(spec("09.03.01"), ege);
    expect(c.ok).toBe(false);
    expect(c.mathBaseOnly).toBe(true);
    const p = StudentProfile.parse({ consent: true, regionId: "moscow", city: "Москва", relocation: "no", egeOrder: "chosen", ege: [{ subject: "rus", score: 80 }, { subject: "math_base", score: 5 }, { subject: "phys", score: 70 }] });
    const pm = computeAllPrograms({ catalog, profile: p, model: buildUserModel(p, catalog.egeSubjects, catalog.regions) }).get("bmstu__09.03.01")!;
    expect(pm.excluded.some((e) => e.type === "math_base")).toBe(true);
  });

  it("набор экзаменов пишется полностью", () => {
    expect(examSetText(spec("09.03.01"))).toMatch(/^Русский \+ Математика \(проф\.\) \+ (Физика или Информатика|Информатика или Физика) \+ Доп\. экзамен: нет$/);
    expect(examSetText(spec("54.03.01"))).toMatch(/Доп\. экзамен: творческий/);
  });

  it("нет готовности к доп. экзамену — программа не пропадает, а уходит в «Если готов изменить»", () => {
    const p = StudentProfile.parse({
      consent: true, start: "interest", regionId: "moscow", city: "Москва", relocation: "no", finance: "paid", egeOrder: "chosen", dviReady: ["none"],
      ege: [{ subject: "rus", score: 85 }, { subject: "lit", score: 85 }, { subject: "soc", score: 80 }],
      hobbies: ["drawing"], subjectLikes: { lit: ["intrinsic"] },
    });
    const progs = computeAllPrograms({ catalog, profile: p, model: buildUserModel(p, catalog.egeSubjects, catalog.regions) });
    const design = [...progs.values()].filter((x) => x.specialtyCode === "54.03.01");
    expect(design.length).toBeGreaterThan(0);
    expect(design.every((x) => x.excluded.some((e) => e.type === "dvi"))).toBe(true);
    const r = recommend(catalog, p);
    expect(r.tradeoffs.some((t) => t.changes.some((c) => c.type === "dvi"))).toBe(true);
  });
});
