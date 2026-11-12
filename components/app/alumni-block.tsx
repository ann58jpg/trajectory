import { ExternalLink } from "lucide-react";
import { alumniOf } from "@/lib/life";
import { UNI_PAGE } from "@/lib/copy";
import { DataGap } from "./data-gap";

/** «Известные выпускники»: из Wikidata, без фото, у каждого — ссылка на источник. */
export function AlumniBlock({ universityId }: { universityId: string }) {
  const a = alumniOf(universityId);
  if (!a || a.people.length === 0) return <DataGap what={UNI_PAGE.alumniGapWhat} where={UNI_PAGE.alumniGapWhere} />;
  return (
    <div className="space-y-2" data-testid="alumni">
      <ul className="grid gap-2 sm:grid-cols-2">
        {a.people.map((p) => (
          <li key={p.source} className="rounded-lg border p-3 text-sm" data-testid="alumnus">
            <p className="font-medium">{p.name}</p>
            <p className="text-muted-foreground">{p.role}</p>
            <p className="text-xs text-muted-foreground">
              {[p.years ? UNI_PAGE.alumniYears(p.years) : null, p.born ? UNI_PAGE.alumniBorn(p.born) : null].filter(Boolean).join(" · ")}
              {" "}<a href={p.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">Wikidata <ExternalLink className="h-3 w-3" /></a>
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{UNI_PAGE.alumniSource}</p>
    </div>
  );
}
