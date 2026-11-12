import { CRUMBS, PLAN } from "@/lib/copy";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { Plan } from "./plan";

export const metadata = { title: PLAN.title };

export default function PlanPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.plan }]} />
      <Plan />
    </>
  );
}
