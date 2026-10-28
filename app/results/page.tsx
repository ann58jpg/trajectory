import { Results } from "./results";
import { PAGE_TITLES } from "@/lib/copy";

export const metadata = { title: PAGE_TITLES.results };

export default function ResultsPage() {
  return <Results />;
}
