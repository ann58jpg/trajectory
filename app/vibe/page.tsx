import { getCatalog } from "@/lib/db/catalog";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { CRUMBS, VIBE_TEST } from "@/lib/copy";
import { VibeTest } from "./vibe-test";

export const metadata = { title: VIBE_TEST.title };

export default async function VibePage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  const unis = getCatalog().universities.filter((x) => !x.abroad).map((x) => ({ id: x.id, short: x.short, name: x.name, city: x.city }));
  return (
    <>
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: VIBE_TEST.title }]} />
      <VibeTest universities={unis} initialUni={u ?? null} />
    </>
  );
}
