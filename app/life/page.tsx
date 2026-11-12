import { getCatalog } from "@/lib/db/catalog";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { CRUMBS, LIFE } from "@/lib/copy";
import { ChapterView } from "./view";

export const metadata = { title: LIFE.title };

export default function LifePage() {
  const unis = getCatalog().universities.map((u) => ({ id: u.id, short: u.short, site: u.site, city: u.city }));
  return (
    <>
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.life }]} />
      <ChapterView universities={unis} />
    </>
  );
}
