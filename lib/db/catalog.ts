import "server-only";
import { getDb } from "./client";
import * as schema from "./schema";
import { rawStatic } from "@/lib/data/raw-static";
import { validateCatalog, type Catalog, type RawData } from "@/lib/data/validate";

let cached: { catalog: Catalog; source: "db" | "json" } | null = null;

/** Справочники читаются из SQLite (после `npm run setup`), иначе — напрямую из data/*.json. */
export function getCatalog(): Catalog {
  if (cached) return cached.catalog;
  const db = getDb();
  let raw: RawData | null = null;
  let source: "db" | "json" = "json";
  if (db) {
    try {
      const all = (t: typeof schema.regions) => db.select().from(t).all().map((r) => JSON.parse(r.data));
      raw = {
        regions: all(schema.regions),
        specialties: all(schema.specialties),
        professions: all(schema.professions),
        universities: all(schema.universities),
        programs: all(schema.programs),
        events: all(schema.events),
        priorities: all(schema.priorities),
        egeSubjects: all(schema.egeSubjects),
      };
      source = "db";
      if ((raw.professions as unknown[]).length === 0) raw = null;
    } catch (e) {
      console.warn("[catalog] чтение БД не удалось, используем JSON:", e);
      raw = null;
    }
  }
  if (!raw) {
    raw = rawStatic;
    source = "json";
  }
  const { catalog, errors } = validateCatalog(raw);
  if (!catalog) throw new Error("Справочники невалидны: " + errors.slice(0, 5).join("; "));
  cached = { catalog, source };
  return catalog;
}

export const catalogSource = () => cached?.source ?? "json";
