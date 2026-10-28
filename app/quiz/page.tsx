import { getCatalog } from "@/lib/db/catalog";
import { Quiz } from "./quiz";
import { PAGE_TITLES } from "@/lib/copy";

export const metadata = { title: PAGE_TITLES.quiz };

export default function QuizPage() {
  const c = getCatalog();
  return (
    <Quiz
      regions={c.regions.filter((r) => r.id !== "abroad").map((r) => ({ id: r.id, name: r.name, cities: r.cities.map((x) => x.name) }))}
      universities={c.universities.map((u) => ({ id: u.id, short: u.short, name: u.name, city: u.city, abroad: u.abroad, aliases: u.aliases }))}
      subjects={c.egeSubjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
