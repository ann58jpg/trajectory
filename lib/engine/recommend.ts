import type { ComparisonSide, ProgramMatch, Rec, RecommendResponse, StudentProfile } from "@/lib/schemas";
import type { Catalog } from "@/lib/data/validate";
import { buildPortrait, buildUserModel } from "./profile";
import { computeAllPrograms, computeRecs, rankRecs } from "./scoring";
import { computeTradeoffs } from "./tradeoffs";
import { egeCheck } from "./filters";
import { hasBudget } from "./exams";
import { yearsWord } from "./ru";

const START_T = { interest: 0, money: 1, balance: 0.5, unknown: 0.5 } as const;

function roiSeries(rec: Rec, p: StudentProfile, tuitionPerYear: number): { year: number; cumulative: number }[] {
  const out: { year: number; cumulative: number }[] = [];
  let cum = 0;
  const Y = Math.ceil(rec.years);
  for (let year = 1; year <= 10; year++) {
    let income = 0;
    if (year <= Y) {
      cum -= tuitionPerYear;
      const canWork = (p.moneyHorizon === "asap" || p.moneyHorizon === "parttime") && rec.earlyEntryCourse !== null && year >= rec.earlyEntryCourse;
      if (canWork) income = rec.salary.junior * 0.5 * 12;
    } else {
      const exp = year - Y; // лет опыта
      const monthly =
        exp <= 1 ? rec.salary.junior
        : exp <= 3 ? rec.salary.junior + ((rec.salary.middle - rec.salary.junior) * (exp - 1)) / 2
        : exp <= 7 ? rec.salary.middle + ((rec.salary.senior - rec.salary.middle) * (exp - 3)) / 4
        : rec.salary.senior;
      income = monthly * 12;
    }
    cum += income;
    out.push({ year, cumulative: Math.round(cum) });
  }
  return out;
}

function sideFor(rec: Rec | undefined, p: StudentProfile, catalog: Catalog, sacrifices: string[]): ComparisonSide | null {
  if (!rec) return null;
  const prof = catalog.professions.find((x) => x.id === rec.professionId)!;
  const best = rec.programs[0];
  const tuition = best && hasBudget(best) && best.chance !== "risky" && best.chance !== "low" ? 0 : best?.price ?? 0;
  const risks: string[] = [];
  if (prof.aiRisk >= 0.5) risks.push(`высокий риск автоматизации ИИ (${Math.round(prof.aiRisk * 100)}%)`);
  if (rec.outlook !== "green") risks.push(rec.outlookReason.split(";")[0]);
  if (best && (best.chance === "low" || best.chance === "risky")) risks.push(`шанс поступления на бюджет: ${best.chance === "low" ? "низкий" : "рискованно"}`);
  if (!risks.length) risks.push("существенных рисков по данным не видно");
  return {
    professionId: rec.professionId,
    name: rec.name,
    salary1: rec.salary.junior,
    salary3: Math.round((rec.salary.junior + rec.salary.middle) / 2 / 1000) * 1000,
    salary5: rec.salary.middle,
    years: rec.years,
    match: rec.factors.match,
    outlook: rec.outlook,
    aiRisk: prof.aiRisk,
    risks,
    sacrifices,
    roi: roiSeries(rec, p, tuition),
    tuitionPerYear: tuition,
  };
}

export function recommend(catalog: Catalog, profile: StudentProfile, mode: "ai" | "demo" = "demo"): RecommendResponse {
  const model = buildUserModel(profile, catalog.egeSubjects, catalog.regions);
  const ctx = { catalog, profile, model };
  const programs = computeAllPrograms(ctx);
  const recs = computeRecs(ctx, programs);
  const tradeoffs = computeTradeoffs(recs, profile, model, catalog, programs);

  const iBest = rankRecs(recs, 0)[0];
  const mBest = rankRecs(recs, 1, { moneyMode: true })[0];
  const mSacr: string[] = [];
  if (iBest && mBest && mBest.professionId !== iBest.professionId) {
    if (mBest.factors.match < iBest.factors.match) mSacr.push(`интереснее на ${Math.round((iBest.factors.match - mBest.factors.match) * 100)} п.п. меньше`);
    if (mBest.years > iBest.years) mSacr.push(`учиться дольше на ${yearsWord(Math.round((mBest.years - iBest.years) * 12) / 12)}`);
  }
  const iSacr: string[] = [];
  if (iBest && mBest && mBest.salary.middle > iBest.salary.middle)
    iSacr.push(`доход через 5 лет ниже на ~${(Math.round((mBest.salary.middle - iBest.salary.middle) / 1000) * 1000).toLocaleString("ru-RU")} ₽/мес`);

  // Программы по специальностям (для «Где учиться») — только прошедшие фильтры
  const specialtyPrograms: Record<string, ProgramMatch[]> = {};
  for (const pm of programs.values()) {
    if (pm.excluded.length) continue;
    if (profile.relocation === "no" && pm.online && !pm.local && model.region && pm.regionId !== model.region.id) continue;
    (specialtyPrograms[pm.specialtyCode] ??= []).push(pm);
  }
  for (const k of Object.keys(specialtyPrograms)) specialtyPrograms[k] = specialtyPrograms[k].sort((a, b) => b.score - a.score).slice(0, 8);

  // Подсказки по ЕГЭ («подберу предметы под цель»)
  const egeNames = new Map(catalog.egeSubjects.map((s) => [s.id, s.name]));
  const egeAdvice: string[] = [];
  const top = rankRecs(recs, START_T[profile.start ?? "unknown"], { onlyAvailable: false }).slice(0, 4);
  for (const r of top) {
    const spec = catalog.specialties.find((s) => r.specialtyCodes.includes(s.code) && s.level !== "spo");
    if (!spec) continue;
    const need = [...spec.ege.mandatory.map((s) => egeNames.get(s)), spec.ege.oneOf.length ? spec.ege.oneOf.map((s) => egeNames.get(s)).join(" / ") : null].filter(Boolean);
    const check = egeCheck(spec, model.ege);
    const status = !model.egeChosen ? "" : check.ok ? " — у тебя всё есть" : " — не хватает предмета";
    egeAdvice.push(`«${r.name}» (${spec.code} ${spec.name}): ${need.join(", ")}${status}`);
  }

  const confidence = Math.round(model.completeness * 100) / 100;
  return {
    recs,
    specialties: catalog.specialties.map((s) => ({ code: s.code, name: s.name, level: s.level, years: s.years })),
    specialtyPrograms,
    tradeoffs,
    comparison: { interests: sideFor(iBest, profile, catalog, iSacr), money: sideFor(mBest, profile, catalog, mSacr) },
    portrait: buildPortrait(profile, model),
    confidence,
    missing: model.missing,
    egeAdvice,
    startT: START_T[profile.start ?? "unknown"],
    mode,
    generatedAt: new Date().toISOString(),
  };
}
