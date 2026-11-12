import { getCatalog } from "@/lib/db/catalog";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { CAREER, CRUMBS } from "@/lib/copy";
import { ChapterView } from "./view";

export const metadata = { title: CAREER.title };

export default function CareerPage() {
  const c = getCatalog();
  const uniNames = Object.fromEntries(c.universities.map((u) => [u.id, u.short]));
  const areas = Object.fromEntries(c.regions.map((r) => [r.id, r.hhAreaId]));
  return (
    <>
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.career }]} />
      <ChapterView uniNames={uniNames} areas={areas} />
    </>
  );
}
