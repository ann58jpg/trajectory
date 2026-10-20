import { loadRawJson } from "../lib/data/load-json";
import { validateCatalog } from "../lib/data/validate";
import { recommend } from "../lib/engine/recommend";
import { rankRecs } from "../lib/engine/scoring";
import { PERSONAS } from "../lib/personas";

const { catalog } = validateCatalog(loadRawJson());
for (const [id, persona] of Object.entries(PERSONAS)) {
  const r = recommend(catalog!, persona.profile);
  console.log(`\n=== ${persona.title} — ${r.portrait} (уверенность ${r.confidence})`);
  const show = (t: number, money = false) => rankRecs(r.recs, t, { moneyMode: money }).slice(0, 6)
    .map((x) => `${x.name} [${x.score.toFixed(2)} m${x.factors.match.toFixed(2)} ${x.salary.middle / 1000}k ${x.programs[0]?.universityShort ?? "-"}/${x.programs[0]?.city ?? ""} ${x.programs[0]?.chance ?? ""}]`).join("\n   ");
  console.log(" t=0:\n   " + show(0));
  console.log(" t=1:\n   " + show(1, true));
  console.log(" tradeoffs:\n   " + r.tradeoffs.slice(0, 4).map((t) => t.sentence).join("\n   "));
  const unis = new Set(rankRecs(r.recs, 0).flatMap((x) => x.programs.map((p) => `${p.universityShort}(${p.regionId})`)));
  console.log(" unis t=0:", [...unis].slice(0, 25).join(", "));
}
