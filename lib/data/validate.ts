import { z } from "zod";
import {
  EgeSubject, Priority, Profession, Program, Region, Specialty, UniEvent, University,
} from "@/lib/schemas";

export type RawData = {
  regions: unknown; specialties: unknown; professions: unknown; universities: unknown;
  programs: unknown; events: unknown; priorities: unknown; egeSubjects: unknown;
};

export const CatalogSchema = z.object({
  regions: z.array(Region),
  specialties: z.array(Specialty),
  professions: z.array(Profession),
  universities: z.array(University),
  programs: z.array(Program),
  events: z.array(UniEvent),
  priorities: z.array(Priority),
  egeSubjects: z.array(EgeSubject),
});
export type Catalog = z.infer<typeof CatalogSchema>;

/** Схема + ссылочная целостность. Возвращает ошибки (критичные) и предупреждения. */
export function validateCatalog(raw: RawData): { catalog: Catalog | null; errors: string[]; warnings: string[] } {
  const parsed = CatalogSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      catalog: null,
      errors: parsed.error.issues.slice(0, 30).map((i) => `${i.path.join(".")}: ${i.message}`),
      warnings: [],
    };
  }
  const c = parsed.data;
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = (arr: { id: string }[]) => new Set(arr.map((x) => x.id));
  const regionIds = ids(c.regions);
  const uniIds = ids(c.universities);
  const profIds = ids(c.professions);
  const prioIds = ids(c.priorities);
  const egeIds = ids(c.egeSubjects);
  const specCodes = new Set(c.specialties.map((s) => s.code));

  const dup = (name: string, arr: string[]) => {
    const seen = new Set<string>();
    for (const x of arr) { if (seen.has(x)) errors.push(`${name}: дубликат ${x}`); seen.add(x); }
  };
  dup("regions", c.regions.map((x) => x.id));
  dup("professions", c.professions.map((x) => x.id));
  dup("universities", c.universities.map((x) => x.id));
  dup("programs", c.programs.map((x) => x.id));
  dup("specialties", c.specialties.map((x) => x.code));

  for (const r of c.regions) for (const n of r.neighbors) if (!regionIds.has(n)) warnings.push(`region ${r.id}: сосед ${n} вне справочника (игнорируется)`);
  for (const s of c.specialties) for (const e of [...s.ege.mandatory, ...s.ege.oneOf]) if (!egeIds.has(e)) errors.push(`specialty ${s.code}: неизвестный предмет ${e}`);
  for (const p of c.professions) {
    for (const s of p.specialties) if (!specCodes.has(s)) errors.push(`profession ${p.id}: нет специальности ${s}`);
    for (const s of p.similar) if (!profIds.has(s)) errors.push(`profession ${p.id}: нет похожей профессии ${s}`);
    for (const s of p.priorities) if (!prioIds.has(s)) errors.push(`profession ${p.id}: нет приоритета ${s}`);
    if (!(p.salary.junior <= p.salary.middle && p.salary.middle <= p.salary.senior && p.salary.senior <= p.salary.ceiling))
      errors.push(`profession ${p.id}: зарплатная лестница не монотонна`);
  }
  for (const u of c.universities) if (!regionIds.has(u.regionId)) errors.push(`university ${u.id}: нет региона ${u.regionId}`);
  for (const pr of c.programs) {
    if (!uniIds.has(pr.universityId)) errors.push(`program ${pr.id}: нет вуза`);
    if (!specCodes.has(pr.specialtyCode)) errors.push(`program ${pr.id}: нет специальности`);
  }
  for (const e of c.events) if (!uniIds.has(e.universityId)) errors.push(`event ${e.id}: нет вуза`);

  // Каждая профессия должна вести хотя бы к одной программе — цепочка без тупиков
  const specWithPrograms = new Set(c.programs.map((p) => p.specialtyCode));
  for (const p of c.professions) if (!p.specialties.some((s) => specWithPrograms.has(s))) errors.push(`profession ${p.id}: нет ни одной программы`);
  for (const u of c.universities) if (!c.programs.some((p) => p.universityId === u.id)) warnings.push(`university ${u.id}: нет программ`);
  for (const u of c.universities) if (!c.events.some((e) => e.universityId === u.id)) errors.push(`university ${u.id}: нет мероприятий`);

  return { catalog: errors.length ? null : c, errors, warnings };
}
