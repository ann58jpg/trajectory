import { getCatalog } from "@/lib/db/catalog";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { CRUMBS, STORY } from "@/lib/copy";
import { StoryForm } from "./story-form";

export const metadata = { title: STORY.title };

export default async function StoryPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  const unis = getCatalog().universities.filter((x) => !x.abroad).map((x) => ({ id: x.id, short: x.short, name: x.name, city: x.city }));
  return (
    <>
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.career, href: "/career" }, { label: STORY.title }]} />
      <StoryForm universities={unis} initial={unis.find((x) => x.id === u) ?? null} />
    </>
  );
}
