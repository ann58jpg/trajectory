import { CRUMBS, TOPBAR } from "@/lib/copy";
import { Breadcrumbs } from "@/components/app/breadcrumbs";

export const metadata = { title: TOPBAR.profile };

export default function ProfilePage() {
  return (
    <div className="space-y-4" data-testid="profile">
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.profile }]} />
      <h1 className="text-2xl font-bold sm:text-3xl">{TOPBAR.profile}</h1>
    </div>
  );
}
