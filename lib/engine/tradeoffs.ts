import type { ExclusionReason, ProgramMatch, Rec, StudentProfile, Tradeoff, TradeoffChange } from "@/lib/schemas";
import type { Catalog } from "@/lib/data/validate";
import { ENGINE } from "./config";
import { cityCoef, rankRecs, remoteCoef } from "./scoring";
import type { UserModel } from "./profile";
import { egeCheck, fmtRub } from "./filters";
import { effectiveDvi } from "./exams";
import { DVI_TEXT } from "@/lib/copy";
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
  const program = catalog.programs.find((x) => x.id === pm.programId)!;
  const spec = catalog.specialties.find((s) => s.code === pm.specialtyCode)!;
  const region = catalog.regions.find((r) => r.id === pm.regionId);
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
          text: replace ? `замени ${SUBJECT_ACC[extra[0]] ?? extra[0]} на ${names[0]} в ЕГЭ` : `добавь к ЕГЭ ${names.join(" и ")}`,
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
  const prof = catalog.professions.find((x) => x.id === rec.professionId)!;
  const region = catalog.regions.find((r) => r.id === pm.regionId)!;
  let coef = changes.some((c) => c.type === "relocate") ? cityCoef(region, pm.city) : m.region ? cityCoef(m.region, m.city) : 1;
  if (region.id === "abroad") coef = 1.5;
  coef = remoteCoef(prof, coef);
  return Math.round((prof.salary.middle * coef) / 1000) * 1000;
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const joinIf = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} и ${list[list.length - 1]}` : list[0]);
/** Изменение ЕГЭ на один предмет — «близкий» вариант; на два и больше — уже другой профиль. */
const egeSubjectsChanged = (changes: TradeoffChange[]) =>
  changes.filter((c) => c.type === "add_ege" || c.type === "replace_ege").reduce((s, c) => s + Math.round(c.cost / 1.5), 0);

/**
 * «Если готов изменить» (пункт 10 правок): только смежные варианты —
 * та же группа направлений, что у подходящих тебе профессий, или ЕГЭ отличается не больше чем на один предмет,
 * или общие интересы (теги, понравившиеся задачи в игре). Не больше двух изменений, 3–5 вариантов по пользе.
 */
export function computeTradeoffs(recs: Rec[], p: StudentProfile, m: UserModel, catalog: Catalog, programs: Map<string, ProgramMatch>): Tradeoff[] {
  const ranked = rankRecs(recs, 0);
  const best = ranked[0];
  if (!best) return [];
  const topRecs = ranked.slice(0, 5);
  const profs = new Map(catalog.professions.map((x) => [x.id, x]));
  const specs = new Map(catalog.specialties.map((s) => [s.code, s]));
  const liked = new Set([...m.subjectWeights.entries()].filter(([, v]) => v.weight >= 0.6).map(([k]) => k));
  const homeName = m.city ?? m.region?.capital ?? "твоём городе";
  // группы и теги того, что уже подходит
  const topSpecByGroup = new Map<string, string>();
  for (const r of topRecs) for (const pm of r.programs.slice(0, 3)) if (!topSpecByGroup.has(pm.specialtyCode.slice(0, 2))) topSpecByGroup.set(pm.specialtyCode.slice(0, 2), pm.specialtyCode);
  const topIds = new Set(topRecs.map((r) => r.professionId));

  const out: (Tradeoff & { useful: number })[] = [];
  for (const rec of recs) {
    if (rec.factors.match < ENGINE.moneyMatchThreshold) continue;
    const prof = profs.get(rec.professionId)!;
    const kind: "unlock" | "relocate" = rec.available ? "relocate" : "unlock";
    if (kind === "relocate" && rec.factors.match < best.factors.match - 0.15) continue;
    if (kind === "unlock" && topIds.has(rec.professionId)) continue;

    let bestOpt: (Option & { closeTo: string }) | null = null;
    for (const pm of programs.values()) {
      if (!prof.specialties.includes(pm.specialtyCode)) continue;
      const changes = changesFor(pm, p, m, catalog);
      if (!changes || changes.length === 0) continue;
      const real = changes.filter((c) => c.type !== "form");
      if (real.length > 2) continue;
      if (kind === "relocate" && real.some((c) => c.type !== "relocate")) continue;
      // смежность
      const g = pm.specialtyCode.slice(0, 2);
      const sameGroupCode = topSpecByGroup.get(g);
      const egeOne = egeSubjectsChanged(real) <= 1;
      const topTwin = topRecs.find((r) => profs.get(r.professionId)!.tags.filter((t) => prof.tags.includes(t)).length >= 2);
      const fromGame = m.game.profs.has(prof.id) || (m.game.groups.get(g) ?? 0) > 0.3;
      let closeTo = "";
      if (kind === "relocate") closeTo = "твоим интересам";
      else if (sameGroupCode && sameGroupCode !== pm.specialtyCode) closeTo = `направлению «${specs.get(sameGroupCode)!.name}», которое тебе уже подходит`;
      else if (fromGame) closeTo = "задачам, которые тебе понравились в игре";
      else if (topTwin) closeTo = `профессии «${topTwin.name}» из твоей подборки`;
      if (!closeTo || !egeOne) continue;
      const salary = salaryAfter(pm, changes, rec, catalog, m);
      const cost = changes.reduce((s, c) => s + c.cost, 0);
      const better = !bestOpt || cost < bestOpt.cost - 0.01 || (Math.abs(cost - bestOpt.cost) < 0.01 && (salary > bestOpt.salary || pm.score > bestOpt.pm.score));
      if (better) bestOpt = { pm, changes, salary, cost, closeTo };
    }
    if (!bestOpt) continue;

    const ref = kind === "unlock" ? best.salary.middle : rec.salary.middle;
    const gainPct = (bestOpt.salary - ref) / ref;
    // полезно, если заметно больше денег или так же интересно, как лучшее сейчас
    if (gainPct < 0.1 && (kind === "relocate" || rec.factors.match < best.factors.match - 0.1)) continue;

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
      const r = catalog.regions.find((x) => x.id === bestOpt!.pm.regionId);
      sacrifices.push(`жизнь в другом городе: аренда ~${rubles(r?.rent ?? 30000)}/мес, если не дадут общежитие`);
    }
    if (prof.outlook.status !== "green") sacrifices.push(`перспектива «${prof.outlook.status === "red" ? "под риском" : "меняется"}»: ${prof.outlook.reason.split(";")[0].toLowerCase()}`);
    if (!sacrifices.length) sacrifices.push(spec.level === "spo" ? "колледж вместо вуза на старте" : `${yearsWord(spec.years)} очной учёбы`);

    const cond = joinIf(bestOpt.changes.filter((c) => c.type !== "form").map((c) => c.ifText || c.text));
    const money = gainPct >= 0.05
      ? ` Зарплата через 5 лет примерно на ${Math.round(gainPct * 100)}% выше (~${rubles(bestOpt.salary)} в месяц).`
      : gainPct <= -0.05 ? ` Зарплата через 5 лет примерно на ${Math.round(-gainPct * 100)}% ниже, зато это ближе к тебе.` : " По деньгам примерно так же.";
    const sentence = kind === "unlock"
      ? `Если ${cond}, сможешь поступить на «${spec.name}» в ${bestOpt.pm.universityShort} (${bestOpt.pm.city}) — это близко к ${bestOpt.closeTo}.${money}`
      : `Если ${cond}, профессия «${prof.name}», которая тебе уже подходит, станет выгоднее, место учёбы — ${bestOpt.pm.universityShort}.${money}`;

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
      useful: 0.55 * rec.factors.match + 0.45 * clamp(gainPct, -0.2, 1) - 0.08 * bestOpt.cost,
    });
  }
  // по пользе; не больше двух вариантов с одним набором изменений и одной профессии из одного направления
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
