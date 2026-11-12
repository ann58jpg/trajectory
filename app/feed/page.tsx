import { FEED, CRUMBS } from "@/lib/copy";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { FeedView } from "./feed-view";

export const metadata = { title: FEED.title };

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <div className="space-y-4" data-testid="feed">
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.feed }]} />
      <h1 className="text-2xl font-bold sm:text-3xl">{FEED.title}</h1>
      <p className="text-muted-foreground">{FEED.lead}</p>
      <FeedView tab={tab === "events" || tab === "internships" || tab === "admission" ? tab : "all"} />
    </div>
  );
}
