import { getCatalog } from "@/lib/db/catalog";
import { PLAN } from "@/lib/copy";
import { Plan } from "./plan";

export const metadata = { title: PLAN.title };

export default function PlanPage() {
  const c = getCatalog();
  return (
    <Plan
      professions={c.professions.map((p) => ({ id: p.id, name: p.name, specialties: p.specialties, outlook: p.outlook.status, outlookReason: p.outlook.reason, tasks: p.tasks }))}
      universities={c.universities.map((u) => ({ id: u.id, short: u.short, city: u.city, admissionUrl: u.admissionUrl, eventsUrl: u.eventsUrl }))}
      programs={c.programs.map((p) => ({ id: p.id, universityId: p.universityId, specialtyCode: p.specialtyCode, name: p.name, passMin: p.passScore.min, passMax: p.passScore.max, budget: p.budgetPlaces, price: p.price }))}
      specialties={c.specialties.map((s) => ({ code: s.code, name: s.name, level: s.level, mandatory: s.ege.mandatory, oneOf: s.ege.oneOf }))}
      subjects={Object.fromEntries(c.egeSubjects.map((s) => [s.id, s.name]))}
    />
  );
}
