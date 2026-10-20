import { getCatalog } from "@/lib/db/catalog";
import { Quiz } from "./quiz";

export const metadata = { title: "Анкета — Траектория" };

export default function QuizPage() {
  const c = getCatalog();
  return (
    <Quiz
      regions={c.regions.filter((r) => r.id !== "abroad").map((r) => ({ id: r.id, name: r.name, cities: r.cities.map((x) => x.name) }))}
      universities={c.universities.map((u) => ({ id: u.id, short: u.short, name: u.name, city: u.city, abroad: u.abroad, aliases: u.aliases }))}
      subjects={c.egeSubjects.filter((s) => s.id !== "creative").map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
