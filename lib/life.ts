import studentLife from "@/data/student_life.json";
import alumniData from "@/data/alumni.json";
import internships from "@/data/internship_programs.json";
import ladder from "@/data/career_ladder.json";

export type Community = { kind: "vk" | "telegram" | "site"; title: string; url: string; source: string };
export type TypicalEvent = { month: number; title: string; source: string };
export type Alumnus = { name: string; role: string; born: number | null; years: string | null; source: string };
export type Internship = (typeof internships.programs)[number];
export type Rung = (typeof ladder.rungs)[number];

type LifeEntry = { wikidata: string; communities: Community[]; typical: TypicalEvent[] };
const LIFE = studentLife.universities as Record<string, LifeEntry>;
const ALUMNI = alumniData.alumni as Record<string, { wikidata: string; people: Alumnus[] }>;

/** Студенческая жизнь вуза из data/student_life.json (сейчас — 30 крупных вузов). */
export const studentLifeOf = (id: string): LifeEntry | null => LIFE[id] ?? null;
export const LIFE_META = studentLife.meta;

/** Известные выпускники из Wikidata («учился в»). */
export const alumniOf = (id: string): { wikidata: string; people: Alumnus[] } | null => ALUMNI[id] ?? null;
export const ALUMNI_META = alumniData.meta;

export const INTERNSHIPS: Internship[] = internships.programs;
export const INTERNSHIPS_META = internships.meta;
export const LADDER: Rung[] = ladder.rungs;
export const LADDER_META = ladder.meta;

/** Стажировки под сферы абитуриента; без сфер — все. */
export function internshipsFor(spheres: string[]): Internship[] {
  if (!spheres.length) return INTERNSHIPS;
  const s = new Set(spheres);
  const hit = INTERNSHIPS.filter((p) => p.spheres.some((x) => s.has(x)));
  return hit.length ? hit : INTERNSHIPS;
}
