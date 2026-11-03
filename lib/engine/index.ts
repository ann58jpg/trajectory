import type { Catalog } from "@/lib/data/validate";
import type { Profession, Program, Region, Specialty, University } from "@/lib/schemas";

/** Индексы каталога по id (программ — тысячи, поиск перебором внутри циклов слишком медленный). */
export type CatalogIndex = {
  programs: Map<string, Program>;
  specialties: Map<string, Specialty>;
  regions: Map<string, Region>;
  professions: Map<string, Profession>;
  universities: Map<string, University>;
};

const cache = new WeakMap<Catalog, CatalogIndex>();

export function catalogIndex(c: Catalog): CatalogIndex {
  let x = cache.get(c);
  if (!x) {
    x = {
      programs: new Map(c.programs.map((p) => [p.id, p])),
      specialties: new Map(c.specialties.map((s) => [s.code, s])),
      regions: new Map(c.regions.map((r) => [r.id, r])),
      professions: new Map(c.professions.map((p) => [p.id, p])),
      universities: new Map(c.universities.map((u) => [u.id, u])),
    };
    cache.set(c, x);
  }
  return x;
}
