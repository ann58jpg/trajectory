import { loadRawJson } from "../lib/data/load-json";
import { validateCatalog } from "../lib/data/validate";

const { catalog, errors, warnings } = validateCatalog(loadRawJson());
for (const w of warnings) console.warn("⚠", w);
if (!catalog) {
  for (const e of errors) console.error("✗", e);
  process.exit(1);
}
const cities = new Set(catalog.universities.map((u) => u.city));
const verified = catalog.programs.filter((p) => p.meta.confidence === "verified").length;
console.log(`✓ Данные валидны: регионов ${catalog.regions.length}, направлений ${catalog.specialties.length}, профессий ${catalog.professions.length}, вузов ${catalog.universities.length} (городов ${cities.size}), программ ${catalog.programs.length} (verified: ${verified}), событий ${catalog.events.length}, приоритетов ${catalog.priorities.length}`);
