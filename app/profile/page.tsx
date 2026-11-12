import { getCatalog } from "@/lib/db/catalog";
import { CABINET, CRUMBS } from "@/lib/copy";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { Cabinet } from "./cabinet";

export const metadata = { title: CABINET.title };

export default function ProfilePage() {
  const c = getCatalog();
  const names = {
    specialties: Object.fromEntries(c.specialties.map((s) => [s.code, s.name])),
    professions: Object.fromEntries(c.professions.map((p) => [p.id, p.name])),
    universities: Object.fromEntries(c.universities.map((u) => [u.id, `${u.short} · ${u.city}`])),
  };
  return (
    <div className="space-y-4" data-testid="profile">
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.profile }]} />
      <Cabinet names={names} />
    </div>
  );
}
