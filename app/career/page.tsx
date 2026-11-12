import { CAREER, CRUMBS } from "@/lib/copy";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { ChapterView } from "./view";

export const metadata = { title: CAREER.title };

export default function Page() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.career }]} />
      <ChapterView />
    </div>
  );
}
