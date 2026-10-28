import type { ExclusionReason, ProgramMatch, Rec, StudentProfile, Tradeoff, TradeoffChange } from "@/lib/schemas";
import type { Catalog } from "@/lib/data/validate";
import { ENGINE } from "./config";
import { cityCoef, rankRecs, remoteCoef } from "./scoring";
import type { UserModel } from "./profile";
import { egeCheck, fmtRub } from "./filters";
import { accusativeCity, prepositionalCity, pointsWord, rubles, SUBJECT_ACC, yearsWord } from "./ru";

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
        changes.push({ type: "relocate", text: `будь ${ready} переехать в ${accusativeCity(pm.city)}${note}`, cost: RELOC_COST[lvl] });
        break;
      }
      case "finance":
        if (program.targetPlaces > 0)
          changes.push({ type: "target", text: "рассмотри вариант, где учёбу оплачивает компания (потом работаешь у неё 3–5 лет)", cost: 1 });
        else if (program.price !== null) changes.push({ type: "paid", text: `рассмотри платное обучение ~${fmtRub(program.price)}/год или образовательный кредит`, cost: 2 });
        else return null;
        break;
      case "vuc":
        changes.push({ type: "drop_vuc", text: "откажись от обязательного военного учебного центра", cost: 2 });
        break;
      case "dorm":
        changes.push({ type: "drop_dorm", text: `рассмотри съём жилья (~${rubles(region?.rent ?? 30000)}/мес)`, cost: 1.5 });
        break;
      case "ege": {
        const c = egeCheck(spec, m.ege);
        const need = [...c.missing, ...(c.oneOfMissing.length ? [c.oneOfMissing[0]] : [])];
        const names = need.map((s) => SUBJECT_ACC[s] ?? s);
        const extra = [...m.ege.keys()].filter((s) => s !== "rus" && !spec.ege.mandatory.includes(s) && !spec.ege.oneOf.includes(s));
        const replace = m.ege.size >= 3 && extra.length > 0 && need.length === 1;
        changes.push({
          type: replace ? "replace_ege" : "add_ege",
          text: replace ? `замени ${SUBJECT_ACC[extra[0]] ?? extra[0]} на ${names[0]} в ЕГЭ` : `добавь к ЕГЭ ${names.join(" и ")}`,
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
    if (need > 0) changes.push({ type: "raise_score", text: `подними сумму ЕГЭ на ${pointsWord(need)} (~${Math.ceil(need / 3)} на предмет)`, cost: 1 + need / 30 });
  }
  // онлайн-программа из другого региона — слабее очной рядом с домом
  if (pm.online && !pm.local && changes.length) changes.push({ type: "form", text: "учись онлайн/заочно", cost: 0.3 });
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const joinChanges = (list: string[]) =>
  list.length > 1 ? `${capitalize(list.slice(0, -1).join(", "))} и ${list[list.length - 1]}` : capitalize(list[0]);

/**
 * «Если готов изменить…» (6.4). Два вида карточек:
 *  1) профессия не прошла фильтры/ЕГЭ, но даёт ≥ +25% к лучшему варианту из «Интересов»;
 *  2) интересная тебе профессия уже доступна, но переезд в крупный город даёт ≥ +25% к её зарплате.
 */
export function computeTradeoffs(recs: Rec[], p: StudentProfile, m: UserModel, catalog: Catalog, programs: Map<string, ProgramMatch>): Tradeoff[] {
  const best = rankRecs(recs, 0)[0];
  if (!best) return [];
  const baseSalary = best.salary.middle;
  const profs = new Map(catalog.professions.map((x) => [x.id, x]));
  const specs = new Map(catalog.specialties.map((s) => [s.code, s]));
  const liked = new Set([...m.subjectWeights.entries()].filter(([, v]) => v.weight >= 0.6).map(([k]) => k));
  const homeName = m.city ?? m.region?.capital ?? "твоём городе";

  const out: (Tradeoff & { rank: number })[] = [];
  for (const rec of recs) {
    if (rec.factors.match < ENGINE.moneyMatchThreshold) continue;
    const prof = profs.get(rec.professionId)!;
    const kind: "unlock" | "relocate" = rec.available ? "relocate" : "unlock";
    if (kind === "relocate" && rec.factors.match < best.factors.match - 0.15) continue;
    if (kind === "unlock" && rec.professionId === best.professionId) continue;

    let bestOpt: Option | null = null;
    for (const pm of programs.values()) {
      if (!prof.specialties.includes(pm.specialtyCode)) continue;
      const changes = changesFor(pm, p, m, catalog);
      if (!changes || changes.length === 0) continue;
      if (kind === "relocate" && changes.some((c) => c.type !== "relocate" && c.type !== "raise_score")) continue;
      const salary = salaryAfter(pm, changes, rec, catalog, m);
      const cost = changes.reduce((s, c) => s + c.cost, 0);
      const better = !bestOpt || cost < bestOpt.cost - 0.01 || (Math.abs(cost - bestOpt.cost) < 0.01 && (salary > bestOpt.salary || pm.score > bestOpt.pm.score));
      if (better) bestOpt = { pm, changes, salary, cost };
    }
    if (!bestOpt) continue;

    const ref = kind === "unlock" ? baseSalary : rec.salary.middle;
    const refLabel = kind === "unlock" ? `у «${best.name}» сейчас` : `в ${prepositionalCity(homeName)}`;
    const gainPct = (bestOpt.salary - ref) / ref;
    if (gainPct < ENGINE.tradeoffMinGain) continue;

    const spec = specs.get(bestOpt.pm.specialtyCode)!;
    const sacrifices: string[] = [];
    if (rec.factors.match < best.factors.match - 0.12)
      sacrifices.push(`меньше совпадений с твоими интересами (${Math.round(rec.factors.match * 100)}% против ${Math.round(best.factors.match * 100)}%)`);
    if (bestOpt.changes.some((c) => c.type === "add_ege" || c.type === "replace_ege")) {
      const req = [...spec.ege.mandatory, ...spec.ege.oneOf.slice(0, 1)].filter((s) => s !== "rus" && s !== "creative" && !liked.has(s));
      if (req.length) sacrifices.push(`больше предметов, которые сейчас не в приоритете: ${req.map((s) => SUBJECT_ACC[s]).join(", ")}`);
    }
    if (spec.years > best.years) sacrifices.push(`дольше учиться: ${yearsWord(spec.years)} вместо ${yearsWord(best.years)}`);
    if (bestOpt.changes.some((c) => c.type === "relocate")) {
      const r = catalog.regions.find((x) => x.id === bestOpt!.pm.regionId);
      sacrifices.push(`жизнь в другом городе: аренда ~${rubles(r?.rent ?? 30000)}/мес, если не дадут общежитие`);
    }
    if (bestOpt.pm.forms.every((f) => f === "full") && p.moneyHorizon === "asap") sacrifices.push("только очная форма — сложнее совмещать с работой");
    if (prof.outlook.status !== "green") sacrifices.push(`перспектива «${prof.outlook.status === "red" ? "под риском" : "меняется"}»: ${prof.outlook.reason.split(";")[0].toLowerCase()}`);
    if (!sacrifices.length) sacrifices.push(spec.level === "spo" ? "колледж вместо вуза на старте" : `${yearsWord(spec.years)} очной учёбы`);

    const head = joinChanges(bestOpt.changes.filter((c) => c.type !== "form").map((c) => c.text));
    const opens = kind === "unlock" ? `откроется «${prof.name}»` : `«${prof.name}» станет заметно выгоднее`;
    const sentence =
      `${head} — ${opens} (${bestOpt.pm.universityShort}, ${bestOpt.pm.city}): ~${rubles(bestOpt.salary)} в месяц через 5 лет ` +
      `против ~${rubles(ref)} ${refLabel} (+${Math.round(gainPct * 100)}%). Компромисс: ${sacrifices[0].replace(/\.$/, "")}.`;

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
      rank: gainPct / bestOpt.cost,
    });
  }
  // меньше изменений и больше выигрыш — выше; не более 2 карточек с одним и тем же набором изменений
  const sorted = out.sort((a, b) => b.rank - a.rank);
  const seen = new Map<string, number>();
  const result: Tradeoff[] = [];
  for (const t of sorted) {
    const key = t.changes.map((c) => c.text).join("|");
    const n = seen.get(key) ?? 0;
    if (n >= 2) continue;
    seen.set(key, n + 1);
    const { rank: _rank, ...rest } = t;
    void _rank;
    result.push(rest);
    if (result.length >= 8) break;
  }
  return result;
}
