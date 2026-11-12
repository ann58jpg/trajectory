import type { ExclusionReason, ProgramMatch, Rec, StudentProfile, Tradeoff, TradeoffChange } from "@/lib/schemas";
import type { Catalog } from "@/lib/data/validate";
import { ENGINE } from "./config";
import { cityCoef, rankRecs, remoteCoef } from "./scoring";
import type { UserModel } from "./profile";
import { egeCheck, fmtRub } from "./filters";
import { effectiveDvi } from "./exams";
import { catalogIndex } from "./index";
import { DVI_TEXT } from "@/lib/copy";
import neighborsData from "@/data/sphere_neighbors.json";
import { accusativeCity, pointsWord, rubles, SUBJECT_ACC, SUBJECT_GEN, yearsWord } from "./ru";

const RELOC_COST = { region: 1, nearest: 1.5, russia: 2.5, abroad: 3.5 } as const;

function relocationLevel(pm: ProgramMatch, m: UserModel): keyof typeof RELOC_COST {
  if (pm.regionId === "abroad") return "abroad";
  if (m.region && pm.regionId === m.region.id) return "region";
  if (m.region && m.region.neighbors.includes(pm.regionId)) return "nearest";
  return "russia";
}

/** Список изменений, которые снимут все препятствия для программы. null — нереалистично. */
function changesFor(pm: ProgramMatch, p: StudentProfile, m: UserModel, catalog: Catalog): TradeoffChange[] | null {
  const changes: TradeoffChange[] = [];
  const ix = catalogIndex(catalog);
  const program = ix.programs.get(pm.programId)!;
  const spec = ix.specialties.get(pm.specialtyCode)!;
  const region = ix.regions.get(pm.regionId);
  const ready = p.gender === "f" ? "готова" : "готов";
  for (const ex of pm.excluded as ExclusionReason[]) {
    switch (ex.type) {
      case "relocation":
      case "abroad": {
        const lvl = relocationLevel(pm, m);
        const note = lvl === "region" ? " (в пределах своего региона)" : lvl === "nearest" ? " (соседний регион)" : "";
        changes.push({ type: "relocate", text: `будь ${ready} переехать в ${accusativeCity(pm.city)}${note}`, ifText: `переедешь в ${accusativeCity(pm.city)}`, cost: RELOC_COST[lvl] });
        break;
      }
      case "finance":
        if ((program.targetPlaces ?? 0) > 0)
          changes.push({ type: "target", text: "рассмотри вариант, где учёбу оплачивает компания (потом работаешь у неё 3–5 лет)", ifText: "пойдёшь на целевое обучение (учёбу оплатит компания)", cost: 1 });
        else if (program.price !== null) changes.push({ type: "paid", text: `рассмотри платное обучение ~${fmtRub(program.price)}/год или образовательный кредит`, ifText: `согласишься на платное обучение (~${fmtRub(program.price)} в год)`, cost: 2 });
        else return null;
        break;
      case "vuc":
        changes.push({ type: "drop_vuc", text: "откажись от обязательного военного учебного центра", ifText: "откажешься от военного учебного центра", cost: 2 });
        break;
      case "dorm":
        changes.push({ type: "drop_dorm", text: `рассмотри съём жилья (~${rubles(region?.rent ?? 30000)}/мес)`, ifText: `снимешь жильё (~${rubles(region?.rent ?? 30000)} в месяц)`, cost: 1.5 });
        break;
      case "math_base":
        changes.push({ type: "math_profile", text: "сдай профильную математику вместо базовой", ifText: "сдашь профильную математику вместо базовой", cost: 1.5 });
        break;
      case "dvi": {
        const dvi = effectiveDvi(spec, program);
        changes.push({ type: "dvi", text: `подготовься к доп. экзамену в вузе: ${dvi ? DVI_TEXT[dvi].short : ""}`, ifText: `подготовишься к доп. экзамену в вузе (${dvi ? DVI_TEXT[dvi].short : ""})`, cost: 1.5 });
        break;
      }
      case "ege": {
        const c = egeCheck(spec, m.ege);
        const need = [...c.missing, ...(c.oneOfMissing.length ? [c.oneOfMissing[0]] : [])].filter((x) => !(c.mathBaseOnly && x === "math"));
        if (!need.length) break;
        const names = need.map((s) => SUBJECT_ACC[s] ?? s);
        const extra = [...m.ege.keys()].filter((s) => s !== "rus" && !spec.ege.mandatory.includes(s) && !spec.ege.oneOf.includes(s));
        const replace = m.ege.size >= 3 && extra.length > 0 && need.length === 1;
        changes.push({
          type: replace ? "replace_ege" : "add_ege",
          text: replace ? `сдай ${names[0]} вместо ${SUBJECT_GEN[extra[0]] ?? extra[0]}` : `досдай ${names.join(" и ")}`,
          ifText: replace ? `сдашь ${names[0]} вместо ${SUBJECT_GEN[extra[0]] ?? extra[0]}` : `досдашь ${names.join(" и ")}`,
          cost: 1.5 * need.length,
        });
        break;
      }
    }
  }
  if ((pm.chance === "low" || pm.chance === "risky") && pm.userSum !== null && pm.passMin !== null) {
    const target = Math.round((pm.passMin + (pm.passMax ?? pm.passMin)) / 2);
    const need = target - pm.userSum;
    if (need > 35) return null; // за год реально прибавить ~10 баллов на предмет
    if (need > 0) changes.push({ type: "raise_score", text: `подними сумму ЕГЭ на ${pointsWord(need)} (~${Math.ceil(need / 3)} на предмет)`, ifText: `поднимешь сумму ЕГЭ на ${pointsWord(need)}`, cost: 1 + need / 30 });
  }
  // онлайн-программа из другого региона — слабее очной рядом с домом
  if (pm.online && !pm.local && changes.length) changes.push({ type: "form", text: "учись онлайн/заочно", ifText: "", cost: 0.3 });
  return changes;
}

type Option = { pm: ProgramMatch; changes: TradeoffChange[]; salary: number; cost: number };

function salaryAfter(pm: ProgramMatch, changes: TradeoffChange[], rec: Rec, catalog: Catalog, m: UserModel): number {
  const ix = catalogIndex(catalog);
  const prof = ix.professions.get(rec.professionId)!;
  const region = ix.regions.get(pm.regionId)!;
  let coef = changes.some((c) => c.type === "relocate") ? cityCoef(region, pm.city) : m.region ? cityCoef(m.region, m.city) : 1;
  if (region.id === "abroad") coef = 1.5;
  coef = remoteCoef(prof, coef);
  return Math.round((prof.salary.middle * coef) / 1000) * 1000;
}

/** «МГТУ (Мурманск)» уже содержит город — второй раз не пишем. */
const uniWhere = (pm: ProgramMatch) => (pm.universityShort.includes(pm.city) ? pm.universityShort : `${pm.universityShort} (${pm.city})`);
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const joinIf = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} и ${list[list.length - 1]}` : list[0]);
/** Изменение ЕГЭ на один предмет — «близкий» вариант; на два и больше — уже другой профиль. */
const egeSubjectsChanged = (changes: TradeoffChange[]) =>
  changes.filter((c) => c.type === "add_ege" || c.type === "replace_ege").reduce((s, c) => s + Math.round(c.cost / 1.5), 0);

const NEIGHBORS = neighborsData.neighbors as Record<string, string[]>;
/** Группы, близкие к уже подходящим: сами группы + их соседи из data/sphere_neighbors.json. */
export function closeGroups(groups: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const g of groups) {
    out.add(g);
    for (const n of NEIGHBORS[g] ?? []) out.add(n);
  }
  return out;
}

/**
 * «Один шаг до…» (раздел 8 v3). Три строгих условия:
 * 1) близость — та же группа направлений, что у подходящих тебе профессий, или соседняя по data/sphere_neighbors.json;
 * 2) ровно одно изменение (один предмет ЕГЭ, переезд, доп. экзамен…);
 * 3) заметная выгода — зарплата выше на 25% и больше, или вуз сильнее по рейтингу, или вакансий в 1,25 раза больше.
 * Итог — 3–5 вариантов (меньше, если честных нет).
 */
export function computeTradeoffs(recs: Rec[], p: StudentProfile, m: UserModel, catalog: Catalog, programs: Map<string, ProgramMatch>): Tradeoff[] {
  const ranked = rankRecs(recs, 0);
  const best = ranked[0];
  if (!best) return [];
  const topRecs = ranked.slice(0, 5);
  const ix = catalogIndex(catalog);
  const profs = new Map(catalog.professions.map((x) => [x.id, x]));
  const specs = new Map(catalog.specialties.map((s) => [s.code, s]));
  const liked = new Set([...m.subjectWeights.entries()].filter(([, v]) => v.weight >= 0.6).map(([k]) => k));
  const homeName = m.city ?? m.region?.capital ?? "твоём городе";
  const topSpecByGroup = new Map<string, string>();
  for (const r of topRecs) for (const pm of r.programs.slice(0, 3)) if (!topSpecByGroup.has(pm.specialtyCode.slice(0, 2))) topSpecByGroup.set(pm.specialtyCode.slice(0, 2), pm.specialtyCode);
  // близость: группы лучшей профессии и их соседи + те же группы, что у остальных профессий из топ-3
  const anchor = new Set(best.programs.slice(0, 1).map((pm) => pm.specialtyCode.slice(0, 2)));
  const near = closeGroups(anchor);
  for (const r of topRecs.slice(0, 3)) for (const pm of r.programs.slice(0, 1)) near.add(pm.specialtyCode.slice(0, 2));
  const topTags = new Map<string, number>();
  for (const r of topRecs.slice(0, 3)) for (const t of profs.get(r.professionId)?.tags ?? []) topTags.set(t, (topTags.get(t) ?? 0) + 1);
  const topIds = new Set(topRecs.map((r) => r.professionId));
  const bestProf = profs.get(best.professionId)!;
  // сильнейший вуз среди того, что уже доступно (меньше место RAEX — сильнее)
  const raexOf = (uid: string) => ix.universities.get(uid)?.ratings.raex ?? null;
  const nowRaex = Math.min(...topRecs.flatMap((r) => r.programs.slice(0, 5).map((pm) => raexOf(pm.universityId) ?? 999)), 999);

  const bySpec = new Map<string, ProgramMatch[]>();
  for (const pm of programs.values()) bySpec.set(pm.specialtyCode, [...(bySpec.get(pm.specialtyCode) ?? []), pm]);
  const out: (Tradeoff & { useful: number })[] = [];
  for (const rec of recs) {
    if (rec.factors.match < ENGINE.moneyMatchThreshold) continue;
    const prof = profs.get(rec.professionId)!;
    const kind: "unlock" | "career" = rec.available ? "career" : "unlock";
    if (kind === "career" && rec.factors.match < best.factors.match - 0.15) continue;
    if (kind === "unlock" && topIds.has(rec.professionId)) continue;
    // та же «сфера» интересов: минимум два общих тега с профессиями из топ-3
    if (kind === "unlock" && prof.tags.filter((t) => topTags.has(t)).length < 2) continue;

    let bestOpt: (Option & { closeTo: string }) | null = null;
    for (const pm of prof.specialties.flatMap((c) => bySpec.get(c) ?? [])) {
      const changes = changesFor(pm, p, m, catalog);
      if (!changes) continue;
      const real = changes.filter((c) => c.type !== "form");
      // ровно одно изменение; ЕГЭ — не больше одного предмета
      if (real.length !== 1 || egeSubjectsChanged(real) > 1) continue;
      if (kind === "career" && real[0].type !== "relocate") continue;
      const g = pm.specialtyCode.slice(0, 2);
      if (!near.has(g)) continue;
      const sameGroupCode = topSpecByGroup.get(g);
      const closeTo = kind === "career" ? "твоим интересам"
        : sameGroupCode && sameGroupCode !== pm.specialtyCode ? `направлению «${specs.get(sameGroupCode)!.name}», которое тебе уже подходит`
        : `направлениям из твоей подборки`;
      const salary = salaryAfter(pm, changes, rec, catalog, m);
      const cost = changes.reduce((s, c) => s + c.cost, 0);
      const better = !bestOpt || cost < bestOpt.cost - 0.01 || (Math.abs(cost - bestOpt.cost) < 0.01 && (salary > bestOpt.salary || pm.score > bestOpt.pm.score));
      if (better) bestOpt = { pm, changes, salary, cost, closeTo };
    }
    if (!bestOpt) continue;

    const ref = kind === "unlock" ? best.salary.middle : rec.salary.middle;
    const gainPct = (bestOpt.salary - ref) / ref;
    const newRaex = raexOf(bestOpt.pm.universityId);
    const strongerUni = newRaex !== null && newRaex + 10 <= nowRaex;
    const demandX = prof.demand.vacanciesRF / Math.max(1, bestProf.demand.vacanciesRF);
    const moreDemand = kind === "unlock" && demandX >= 1.25;
    const moreMoney = gainPct >= ENGINE.tradeoffMinGain;
    if (!moreMoney && !strongerUni && !moreDemand) continue;
    // дальний переезд — только ради заметно более сильного вуза
    const reloc = bestOpt.changes.find((c) => c.type === "relocate");
    if (reloc && reloc.cost >= RELOC_COST.russia && !strongerUni) continue;

    const spec = specs.get(bestOpt.pm.specialtyCode)!;
    const sacrifices: string[] = [];
    if (rec.factors.match < best.factors.match - 0.12)
      sacrifices.push(`меньше совпадений с твоими интересами (${Math.round(rec.factors.match * 100)}% против ${Math.round(best.factors.match * 100)}%)`);
    if (bestOpt.changes.some((c) => c.type === "add_ege" || c.type === "replace_ege")) {
      const req = [...spec.ege.mandatory, ...spec.ege.oneOf.slice(0, 1)].filter((s) => s !== "rus" && !liked.has(s));
      if (req.length) sacrifices.push(`больше предметов, которые сейчас не в приоритете: ${req.map((s) => SUBJECT_ACC[s]).join(", ")}`);
    }
    if (spec.years > best.years) sacrifices.push(`дольше учиться: ${yearsWord(spec.years)} вместо ${yearsWord(best.years)}`);
    if (bestOpt.changes.some((c) => c.type === "relocate")) {
      const r = ix.regions.get(bestOpt!.pm.regionId);
      sacrifices.push(`жизнь в другом городе: аренда ~${rubles(r?.rent ?? 30000)}/мес, если не дадут общежитие`);
    }
    if (prof.outlook.status !== "green") sacrifices.push(`перспектива «${prof.outlook.status === "red" ? "под риском" : "меняется"}»: ${prof.outlook.reason.split(";")[0].toLowerCase()}`);
    if (!sacrifices.length) sacrifices.push(spec.level === "spo" ? "колледж вместо вуза на старте" : `${yearsWord(spec.years)} очной учёбы`);

    const change = bestOpt.changes.find((c) => c.type !== "form")!;
    const gains: string[] = [];
    if (moreMoney) gains.push(`зарплата через 5 лет примерно на ${Math.round(gainPct * 100)}% выше (~${rubles(bestOpt.salary)} в месяц)`);
    if (strongerUni) gains.push(`${bestOpt.pm.universityShort} выше в рейтинге RAEX (около ${newRaex}-го места)`);
    if (moreDemand) gains.push(`вакансий примерно в ${demandX.toFixed(1).replace(".", ",")} раза больше`);
    const gainText = gains.length ? ` — ${joinIf(gains)}.` : ".";
    const sentence = kind === "unlock"
      ? `Один шаг до «${spec.name}» в ${uniWhere(bestOpt.pm)}: ${change.text}${gainText}`
      : `Один шаг до профессии «${prof.name}» с учёбой в ${uniWhere(bestOpt.pm)}: ${change.text}${gainText}`;

    out.push({
      professionId: prof.id,
      professionName: prof.name,
      changes: bestOpt.changes,
      programId: bestOpt.pm.programId,
      universityId: bestOpt.pm.universityId,
      universityName: bestOpt.pm.universityShort,
      city: bestOpt.pm.city,
      salaryNow: ref,
      salaryNowLabel: kind === "unlock" ? best.name : `${prof.name} — ${homeName}`,
      salaryNew: bestOpt.salary,
      gainAbs: bestOpt.salary - ref,
      gainPct: Math.round(gainPct * 100) / 100,
      sacrifices,
      sentence,
      confidence: "estimate",
      match: rec.factors.match,
      closeTo: bestOpt.closeTo,
      useful: 0.55 * rec.factors.match + 0.45 * clamp(gainPct, -0.2, 1) + (strongerUni ? 0.1 : 0) + (moreDemand ? 0.05 : 0) - 0.08 * bestOpt.cost,
    });
  }
  // по пользе; не больше двух вариантов с одним изменением и по одному на направление
  const sorted = out.sort((a, b) => b.useful - a.useful);
  const seen = new Map<string, number>();
  const seenSpec = new Set<string>();
  const result: Tradeoff[] = [];
  for (const t of sorted) {
    const key = t.changes.map((c) => c.text).join("|");
    const n = seen.get(key) ?? 0;
    const specKey = t.programId.split("__")[1];
    if (n >= 2 || seenSpec.has(specKey)) continue;
    seen.set(key, n + 1);
    seenSpec.add(specKey);
    const { useful: _u, ...rest } = t;
    void _u;
    result.push(rest);
    if (result.length >= 5) break;
  }
  return result;
}
