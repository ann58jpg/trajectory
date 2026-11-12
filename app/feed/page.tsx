import { FEED, CRUMBS } from "@/lib/copy";
import { Breadcrumbs } from "@/components/app/breadcrumbs";

export const metadata = { title: FEED.title };

export default function FeedPage() {
  return (
    <div className="space-y-4" data-testid="feed">
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.feed }]} />
      <h1 className="text-2xl font-bold sm:text-3xl">{FEED.title}</h1>
      <p className="text-muted-foreground">{FEED.lead}</p>
    </div>
  );
}
