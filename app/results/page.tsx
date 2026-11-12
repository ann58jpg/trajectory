import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { CRUMBS } from "@/lib/copy";
import { Results } from "./results";
import { PAGE_TITLES } from "@/lib/copy";

export const metadata = { title: PAGE_TITLES.results };

export default function ResultsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.match }]} />
      <Results />
    </>
  );
}
