import type {
  Chance, Factors, Profession, Program, ProgramMatch, Rec, Region, Specialty, StudentProfile, University,
} from "@/lib/schemas";
import type { Catalog } from "@/lib/data/validate";
import { ENGINE, WEIGHT_ANCHORS, weightsAt, type Weights } from "./config";
import { egeCheck, hardFilter, isOnline, reachableRegionIds, fmtRub } from "./filters";
import type { UserModel } from "./profile";
import { HOBBIES } from "./vocab";
import { REASONS } from "@/lib/copy";

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/* ───────────── Метч (интересы) ───────────── */

const POS_W = [1, 0.8, 0.6, 0.5, 0.4, 0.3];

export function tagScore(tags: string[], m: UserModel): { score: number; hits: { tag: string; weight: number; source: string }[] } {
  let num = 0;
  const hits: { tag: string; weight: number; source: string }[] = [];
  tags.forEach((t, i) => {
    const s = m.tags.get(t);
    if (s) {
      num += (POS_W[i] ?? 0.3) * s.weight;
      hits.push({ tag: t, weight: s.weight * (POS_W[i] ?? 0.3), source: s.sources[0] });
    }
  });
  const den = POS_W.slice(0, Math.min(3, tags.length)).reduce((a, b) => a + b, 0);
  return { score: clamp(num / den), hits: hits.sort((a, b) => b.weight - a.weight) };
}

export function matchScore(prof: Profession, m: UserModel): { match: number; hits: { tag: string; weight: number; source: string }[] } {
  const parts: [number, number][] = [];
  const ts = tagScore(prof.tags, m);
  if (m.tags.size > 0) parts.push([ts.score, 0.6]);
  if (m.klimov) parts.push([prof.klimov.reduce((s, k) => s + m.klimov![k], 0) / prof.klimov.length, 0.25]);
  if (m.formats.size > 0) parts.push([prof.workFormats.some((f) => m.formats.has(f)) ? 1 : 0.15, 0.1]);
  const handsy = prof.workFormats.some((f) => f === "production" || f === "field");
  if (m.style.hands + m.style.head > 0) {
    const pref = (m.style.hands - m.style.head) / (m.style.hands + m.style.head); // -1 голова … +1 руки
    parts.push([clamp(0.5 + 0.5 * pref * (handsy ? 1 : -1)), 0.05]);
  }
  if (!parts.length) return { match: 0.5, hits: [] };
  const wsum = parts.reduce((s, p) => s + p[1], 0);
  return { match: clamp(parts.reduce((s, p) => s + p[0] * p[1], 0) / wsum), hits: ts.hits };
}

/* ───────────── Региональные коэффициенты ───────────── */

export function cityCoef(region: Region, city: string | null): number {
  const c = region.cities.find((x) => x.name === city) ?? region.cities.find((x) => x.hub) ?? region.cities[0];
  return region.salaryCoef * c.salaryCoef;
}

/** Где считается зарплата: город проживания или лучший доступный город с профильной отраслью (с поправкой на стоимость жизни). */
export function salaryLocation(prof: Profession, p: StudentProfile, m: UserModel, regions: Region[]): { coef: number; label: string; region: Region | null } {
  const home = m.region;
  const homeCoef = home ? cityCoef(home, m.city) : 1;
  const homeBudget = home?.studentBudget ?? 30000;
  let best = { coef: homeCoef, adj: homeCoef, label: m.city ?? home?.capital ?? "в среднем по РФ", region: home };
  if (p.relocation && p.relocation !== "no") {
    const reach = reachableRegionIds(p, regions);
    const candidates =
      reach === "all" || reach === "all+abroad" ? regions.filter((r) => r.id !== "abroad") : regions.filter((r) => reach.has(r.id));
    for (const r of candidates) {
      if (r.id !== home?.id && !prof.industries.some((i) => r.industries.includes(i))) continue;
      const hub = r.cities.find((c) => c.hub) ?? r.cities[0];
      if (r.id === home?.id && hub.name === m.city) continue;
      const c = r.salaryCoef * hub.salaryCoef;
      const adj = c / Math.sqrt(r.studentBudget / homeBudget);
      if (adj > best.adj * 1.03) best = { coef: c, adj, label: `${hub.name} (при переезде)`, region: r };
    }
  }
  let { coef, label } = best;
  const remote = remoteCoef(prof, coef);
  if (remote > coef * 1.05 && prof.remote === "yes") label = `${label}, с учётом удалёнки`;
  return { coef: remote, label, region: best.region };
}

/** Удалёнка подтягивает зарплату к уровню крупных городов, но не полностью. */
export function remoteCoef(prof: Profession, coef: number): number {
  if (ENGINE.remoteSalaryCoef <= coef) return coef;
  const share = prof.remote === "yes" ? ENGINE.remoteConvergence : prof.remote === "partial" ? ENGINE.remoteConvergence / 3 : 0;
  return coef + (ENGINE.remoteSalaryCoef - coef) * share;
}

/* ───────────── Шанс поступления ───────────── */

export function userSumFor(spec: Specialty, m: UserModel): { sum: number | null; estimatedCreative: boolean } {
  if (spec.level === "spo") return { sum: null, estimatedCreative: false };
  const known = [...m.ege.values()].filter((v): v is number => v !== null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
  let sum = 0;
  let estimatedCreative = false;
  for (const s of spec.ege.mandatory) {
    if (s === "creative") {
      if (avg === null) return { sum: null, estimatedCreative };
      sum += avg; estimatedCreative = true; continue;
    }
    const v = m.ege.get(s);
    if (v === undefined || v === null) return { sum: null, estimatedCreative };
    sum += v;
  }
  if (spec.ege.oneOf.length) {
    const opts = spec.ege.oneOf.map((s) => (s === "creative" ? avg : m.ege.get(s) ?? null)).filter((v): v is number => v !== null && v !== undefined);
    if (!opts.length) return { sum: null, estimatedCreative };
    sum += Math.max(...opts);
  }
  return { sum: Math.round(sum), estimatedCreative };
}

export function chanceFor(pr: Program, spec: Specialty, p: StudentProfile, m: UserModel, uni: University): { chance: Chance; userSum: number | null } {
  if (uni.abroad) return { chance: "unknown", userSum: null };
  if (spec.level === "spo") {
    if (p.gpa === null || pr.passScore.min === null) return { chance: "unknown", userSum: null };
    const g = p.gpa * 100;
    const max = pr.passScore.max ?? pr.passScore.min;
    const mid = (pr.passScore.min + max) / 2;
    return { chance: g >= max ? "high" : g >= mid ? "medium" : g >= pr.passScore.min - 20 ? "low" : "risky", userSum: Math.round(g) };
  }
  const { sum } = userSumFor(spec, m);
  if (sum === null) return { chance: "unknown", userSum: null };
  if (pr.budgetPlaces <= 0) return { chance: sum >= 150 ? "high" : "medium", userSum: sum }; // только платные/онлайн — по минимальным баллам
  if (pr.passScore.min === null) return { chance: "unknown", userSum: sum };
  const max = pr.passScore.max ?? pr.passScore.min;
  const mid = (pr.passScore.min + max) / 2;
  const chance: Chance = sum >= max ? "high" : sum >= mid ? "medium" : sum >= pr.passScore.min - 5 ? "low" : "risky";
  return { chance, userSum: sum };
}

const CHANCE_SCORE: Record<Chance, number> = { high: 1, medium: 0.7, low: 0.4, risky: 0.15, unknown: 0.5 };

/* ───────────── Скоринг программы 6.3 ───────────── */

function criterionScore(
  id: string, pr: Program, uni: University, spec: Specialty, ctx: { local: boolean; online: boolean; chance: Chance; cost: number; egeOk: boolean; tagFit: number },
): number {
  switch (id) {
    case "vibe": return uni.features.includes("studlife") ? 1 : 0.55;
    case "location": return ctx.local ? 1 : ctx.online ? 0.9 : 0.45;
    case "subjects": return ctx.tagFit;
    case "reviews": return uni.ratings.employers;
    case "recommendations": return 0.5;
    case "prestige": return uni.ratings.raex === null ? 0.5 : uni.ratings.raex <= 20 ? 1 : uni.ratings.raex <= 50 ? 0.7 : 0.4;
    case "employer_rating": return uni.ratings.employers;
    case "price": return ctx.cost;
    case "benefits": return pr.targetPlaces > 0 ? 1 : 0.3;
    case "budget_places": return clamp(pr.budgetPlaces / 200);
    case "credit": return pr.price !== null && pr.price > 0 && !uni.abroad ? 0.8 : 0.3;
    case "ege_subjects": return ctx.egeOk ? 1 : 0;
    case "pass_score": return CHANCE_SCORE[ctx.chance];
    case "commute": return ctx.local || ctx.online ? 1 : 0.35;
    case "friends": return 0.5;
    case "employment_speed": return spec.employment.rate;
    case "internships": return uni.features.includes("internships") || pr.partners.length >= 2 ? 1 : 0.4;
    case "work_study": return pr.forms.some((f) => f !== "full") || pr.schedule === "evening" || pr.schedule === "free" || pr.dual ? 1 : 0.2;
    case "schedule": return pr.schedule === "free" || pr.schedule === "evening" ? 1 : pr.schedule === "morning" ? 0.6 : 0.3;
    case "career_help": return uni.features.includes("career") ? 1 : 0.4;
    case "studlife": return uni.features.includes("studlife") ? 1 : 0.4;
    case "dorm": return uni.dorm ? 1 : 0;
    case "vuc": return uni.vuc ? 1 : 0;
    case "exchange": return uni.features.includes("intl") ? 1 : 0.2;
    default: return 0.5;
  }
}

export function scoreProgram(
  pr: Program, uni: University, spec: Specialty, p: StudentProfile, m: UserModel, regions: Region[], egeNames: Map<string, string>,
): ProgramMatch {
  const excluded = hardFilter(pr, uni, spec, p, m, regions, egeNames);
  const online = isOnline(pr);
  const local = Boolean(m.city) && uni.city === m.city;
  const { chance, userSum } = chanceFor(pr, spec, p, m, uni);
  const egeOk = uni.abroad || egeCheck(spec, m.ege).ok || !m.egeChosen;
  const cost = pr.budgetPlaces > 0 && (p.finance === "budget" || p.finance === null || chance === "high" || chance === "medium")
    ? 1
    : pr.price === null ? 0.8 : clamp(1 - pr.price / 800000);
  const tagFit = tagScore(spec.tags, m).score;
  const ctx = { local, online, chance, cost, egeOk, tagFit };

  // критерии вуза из вопроса 19: вес 5..1 по рангу
  let critNum = 0, critDen = 0;
  const hits: string[] = [];
  p.uniCriteria.forEach((c, i) => {
    const w = 5 - i;
    const s = criterionScore(c, pr, uni, spec, ctx);
    critNum += s * w; critDen += w;
    if (s >= 0.8) hits.push(c);
  });
  const criteria = critDen ? critNum / critDen : 0.6;
  const logistics = local ? 1 : online ? 0.85 : m.region && uni.regionId === m.region.id ? 0.8 : m.region?.neighbors.includes(uni.regionId) ? 0.6 : 0.4;
  const flexible = pr.forms.some((f) => f !== "full") || pr.dual || pr.schedule === "evening";
  const horizonFit =
    p.moneyHorizon === "asap" ? (flexible ? 1 : pr.schedule === "free" ? 0.7 : spec.level === "spo" ? 0.8 : 0.25)
    : p.moneyHorizon === "parttime" ? (flexible || pr.schedule === "free" ? 1 : 0.5)
    : 0.6;
  // для сильных профилей без спешки колледж — запасной вариант, не основной
  const spoPenalty = spec.level === "spo" && p.moneyHorizon !== "asap" && p.moneyHorizon !== "parttime" ? 0.15 : 0;
  // сильному абитуриенту не стоит уезжать в вуз заметно слабее его уровня
  const overqualified = userSum !== null && pr.passScore.max !== null && spec.level !== "spo" && userSum - pr.passScore.max > 35 && !local ? 0.08 : 0;
  const score = clamp(0.3 * CHANCE_SCORE[chance] + 0.25 * criteria + 0.15 * cost + 0.15 * logistics + 0.15 * horizonFit - spoPenalty - overqualified);

  return {
    programId: pr.id,
    universityId: uni.id,
    universityName: uni.name,
    universityShort: uni.short,
    city: uni.city,
    regionId: uni.regionId,
    specialtyCode: spec.code,
    programName: pr.name,
    forms: pr.forms,
    passMin: pr.passScore.min,
    passMax: pr.passScore.max,
    passConfidence: pr.passScore.meta.confidence,
    userSum,
    chance,
    price: pr.price,
    budgetPlaces: pr.budgetPlaces,
    score: Math.round(score * 1000) / 1000,
    criteriaHits: hits,
    online,
    local,
    excluded,
  };
}

/* ───────────── Факторы профессии 6.2 ───────────── */

export type ScoredContext = {
  catalog: Catalog;
  profile: StudentProfile;
  model: UserModel;
};

export function computeAllPrograms(ctx: ScoredContext): Map<string, ProgramMatch> {
  const { catalog, profile, model } = ctx;
  const uni = new Map(catalog.universities.map((u) => [u.id, u]));
  const spec = new Map(catalog.specialties.map((s) => [s.code, s]));
  const egeNames = new Map(catalog.egeSubjects.map((s) => [s.id, s.name]));
  const out = new Map<string, ProgramMatch>();
  for (const pr of catalog.programs) {
    out.set(pr.id, scoreProgram(pr, uni.get(pr.universityId)!, spec.get(pr.specialtyCode)!, profile, model, catalog.regions, egeNames));
  }
  return out;
}

export function computeRecs(ctx: ScoredContext, programs: Map<string, ProgramMatch>): Rec[] {
  const { catalog, profile: p, model: m } = ctx;
  const specs = new Map(catalog.specialties.map((s) => [s.code, s]));
  const prioName = new Map(catalog.priorities.map((x) => [x.id, x.name]));
  const reach = reachableRegionIds(p, catalog.regions);
  const reachRegions =
    reach === "all" || reach === "all+abroad" ? catalog.regions.filter((r) => r.id !== "abroad") : catalog.regions.filter((r) => reach.has(r.id));
  if (!reachRegions.length && m.region) reachRegions.push(m.region);

  const programsBySpec = new Map<string, ProgramMatch[]>();
  for (const pm of programs.values()) {
    const arr = programsBySpec.get(pm.specialtyCode) ?? [];
    arr.push(pm);
    programsBySpec.set(pm.specialtyCode, arr);
  }

  type Raw = {
    prof: Profession; vacancies: number; salaryCoef: number; salaryLabel: string; costIdx: number;
    match: number; hits: { tag: string; weight: number; source: string }[];
  };
  const raws: Raw[] = catalog.professions.map((prof) => {
    let vac = 0;
    for (const r of reachRegions) {
      const boost = prof.industries.some((i) => r.industries.includes(i)) ? 1.5 : 0.8;
      vac += prof.demand.vacanciesRF * r.vacancyShare * boost;
    }
    if (prof.remote === "yes") vac += prof.demand.vacanciesRF * 0.12;
    const loc = salaryLocation(prof, p, m, catalog.regions);
    const costIdx = Math.sqrt((loc.region?.studentBudget ?? 30000) / 30000);
    const { match, hits } = matchScore(prof, m);
    return { prof, vacancies: Math.round(vac), salaryCoef: loc.coef, salaryLabel: loc.label, costIdx, match, hits };
  });

  const maxLogVac = Math.max(...raws.map((r) => Math.log1p(r.vacancies)));
  const realMid = (r: Raw) => (r.prof.salary.middle * r.salaryCoef) / r.costIdx;
  const realCeil = (r: Raw) => (r.prof.salary.ceiling * r.salaryCoef) / r.costIdx;
  const maxMid = Math.max(...raws.map(realMid));
  const maxCeil = Math.max(...raws.map(realCeil));

  return raws.map((r) => {
    const prof = r.prof;
    const profSpecs = prof.specialties.map((c) => specs.get(c)!).filter(Boolean);
    const allProgs = profSpecs.flatMap((s) => programsBySpec.get(s.code) ?? []);
    const passing = allProgs.filter((x) => x.excluded.length === 0);
    const egeOk = !m.egeChosen || profSpecs.some((s) => egeCheck(s, m.ege).ok);
    const passingSpecs = profSpecs.filter((s) => passing.some((x) => x.specialtyCode === s.code));
    const bestSpec = (passingSpecs.length ? passingSpecs : profSpecs).reduce((a, b) => (b.employment.rate > a.employment.rate ? b : a));

    const demand = clamp(0.75 * (maxLogVac > 0 ? Math.log1p(r.vacancies) / maxLogVac : 0) + 0.25 * clamp((prof.demand.trend + 0.1) / 0.5));
    const income = clamp(0.65 * (realMid(r) / maxMid) + 0.35 * (realCeil(r) / maxCeil));
    const employment = clamp(0.7 * bestSpec.employment.rate + 0.3 * (1 - Math.min(bestSpec.employment.monthsToJob, 12) / 12));
    const prioBase = prof.priorities.length ? 0.5 + 0.12 * Math.min(prof.priorities.length, 4) : 0.3;
    const outlookAdj = prof.outlook.status === "green" ? 0.25 : prof.outlook.status === "red" ? -0.3 : 0;
    const priority = clamp(prioBase + outlookAdj - prof.aiRisk * 0.25);
    const factors: Factors = { demand, income, employment, priority, match: r.match };

    // Бонус горизонта денег
    const bonusNotes: string[] = [];
    let bonus = 0;
    const hz = p.moneyHorizon === "asap" ? ENGINE.horizon.asap : p.moneyHorizon === "parttime" ? ENGINE.horizon.parttime : null;
    if (hz) {
      if (prof.earlyEntryCourse !== null && prof.earlyEntryCourse <= 1) { bonus += hz.early1; bonusNotes.push(REASONS.early1); }
      else if (prof.earlyEntryCourse === 2) { bonus += hz.early2; bonusNotes.push(REASONS.early2); }
      else if (prof.earlyEntryCourse === 3) { bonus += hz.early3; bonusNotes.push(REASONS.early3); }
      if (passing.some((x) => x.forms.some((f) => f !== "full")) || passing.some((x) => catalog.programs.find((q) => q.id === x.programId)?.dual)) {
        bonus += hz.flexibleForm; bonusNotes.push(REASONS.flexible);
      }
      if (passing.some((x) => specs.get(x.specialtyCode)?.level === "spo")) { bonus += hz.spo; bonusNotes.push(REASONS.spo); }
      const minYears = Math.min(...(passingSpecs.length ? passingSpecs : profSpecs).map((s) => s.years));
      if (minYears >= 6) { bonus += hz.longPenalty; bonusNotes.push(REASONS.long); }
    }
    if (p.guides.includes("remote") && prof.remote === "yes") { bonus += 0.03; bonusNotes.push(REASONS.remote); }
    if (p.guides.includes("employment")) bonus += 0.04 * (employment - 0.7);

    // Причины (2–4 человеческих)
    const reasons: string[] = [];
    for (const h of r.hits.slice(0, 2)) reasons.push(REASONS.interest(h.source));
    if (prof.demand.trend >= 0.1) reasons.push(REASONS.demandGrows(Math.round(prof.demand.trend * 100)));
    if (prof.priorities.length) reasons.push(REASONS.priority(prioName.get(prof.priorities[0]) ?? ""));
    if (bonusNotes.length && hz) reasons.push(bonusNotes[0]);
    if (prof.outlook.status === "red") reasons.push(REASONS.careful(prof.outlook.reason.split(";")[0]));
    if (reasons.length < 2) reasons.push(REASONS.salary(fmtRub(prof.salary.middle * r.salaryCoef), r.salaryLabel));

    const topPrograms = passing
      .slice()
      .sort((a, b) => b.score - a.score)
      .filter((x) => !(p.relocation === "no" && x.online && !x.local && m.region && x.regionId !== m.region.id));
    const onlineElsewhere = p.relocation === "no" ? passing.filter((x) => x.online && m.region && x.regionId !== m.region.id).length : 0;

    const yearsAll = (passingSpecs.length ? passingSpecs : profSpecs).map((s) => s.years);
    return {
      professionId: prof.id,
      name: prof.name,
      specialtyCodes: prof.specialties,
      factors,
      bonus: Math.round(bonus * 1000) / 1000,
      bonusNotes,
      salary: {
        junior: Math.round((prof.salary.junior * r.salaryCoef) / 1000) * 1000,
        middle: Math.round((prof.salary.middle * r.salaryCoef) / 1000) * 1000,
        senior: Math.round((prof.salary.senior * r.salaryCoef) / 1000) * 1000,
        ceiling: Math.round((prof.salary.ceiling * r.salaryCoef) / 1000) * 1000,
        regionName: r.salaryLabel,
        confidence: prof.salary.meta.confidence,
        source: prof.salary.meta.source,
      },
      vacancies: r.vacancies,
      vacanciesTrend: prof.demand.trend,
      outlook: prof.outlook.status,
      outlookReason: prof.outlook.reason,
      earlyEntryCourse: prof.earlyEntryCourse,
      remote: prof.remote,
      reasons: reasons.slice(0, 4),
      tasks: prof.tasks.slice(0, 5),
      available: topPrograms.length > 0,
      egeOk,
      programs: topPrograms.slice(0, 6),
      onlineElsewhere,
      years: Math.min(...yearsAll),
    };
  });
}

/* ───────────── Чистые функции для клиента (ползунок) ───────────── */

export function scoreRec(rec: Pick<Rec, "factors" | "bonus">, t: number, anchors = WEIGHT_ANCHORS): number {
  const w: Weights = weightsAt(t, anchors);
  const f = rec.factors;
  return w.demand * f.demand + w.income * f.income + w.employment * f.employment + w.priority * f.priority + w.match * f.match + rec.bonus;
}

export function contributions(rec: Pick<Rec, "factors">, t: number, anchors = WEIGHT_ANCHORS) {
  const w = weightsAt(t, anchors);
  return (Object.keys(w) as (keyof Weights)[]).map((k) => ({ key: k, value: w[k] * rec.factors[k] }));
}

/** Рейтинг для текущего положения ползунка. В режиме «Деньги» действует порог совместимости. */
export function rankRecs<T extends Pick<Rec, "factors" | "bonus" | "available">>(
  recs: T[], t: number, opts: { anchors?: typeof WEIGHT_ANCHORS; moneyMode?: boolean; onlyAvailable?: boolean } = {},
): (T & { score: number })[] {
  const threshold = opts.moneyMode || t >= 0.75 ? ENGINE.moneyMatchThreshold : 0;
  return recs
    .filter((r) => (opts.onlyAvailable === false ? true : r.available) && r.factors.match >= threshold)
    .map((r) => ({ ...r, score: scoreRec(r, t, opts.anchors) }))
    .sort((a, b) => b.score - a.score);
}

export { HOBBIES };
