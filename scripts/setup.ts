/* npm run setup: миграция SQLite + валидация справочников + seed. */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { sql } from "drizzle-orm";
import { openDbForSetup, dbPath } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { loadRawJson } from "../lib/data/load-json";
import { validateCatalog } from "../lib/data/validate";

const { db, sqlite } = openDbForSetup();
migrate(db, { migrationsFolder: "./drizzle" });

const { catalog, errors, warnings } = validateCatalog(loadRawJson());
warnings.forEach((w) => console.warn("⚠", w));
if (!catalog) {
  errors.forEach((e) => console.error("✗", e));
  process.exit(1);
}

const rows = (list: { id?: string; code?: string }[]) => list.map((x) => ({ id: (x.id ?? x.code)!, data: JSON.stringify(x) }));
const tables = [
  [schema.regions, rows(catalog.regions)],
  [schema.specialties, rows(catalog.specialties)],
  [schema.professions, rows(catalog.professions)],
  [schema.universities, rows(catalog.universities)],
  [schema.programs, rows(catalog.programs)],
  [schema.events, rows(catalog.events)],
  [schema.priorities, rows(catalog.priorities)],
  [schema.egeSubjects, rows(catalog.egeSubjects)],
] as const;

db.transaction((tx) => {
  for (const [table, list] of tables) {
    tx.delete(table).run();
    for (const row of list) tx.insert(table).values(row).run();
  }
});

const count = (t: (typeof tables)[number][0]) => db.select({ n: sql<number>`count(*)` }).from(t).get()?.n ?? 0;
console.log(`✓ БД: ${dbPath()}`);
console.log(
  `  регионов ${count(schema.regions)}, направлений ${count(schema.specialties)}, профессий ${count(schema.professions)}, ` +
    `вузов ${count(schema.universities)}, программ ${count(schema.programs)}, событий ${count(schema.events)}, ` +
    `приоритетов ${count(schema.priorities)}, предметов ЕГЭ ${count(schema.egeSubjects)}`,
);
sqlite.close();
