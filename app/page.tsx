import Link from "next/link";
import { ShieldCheck, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCatalog } from "@/lib/db/catalog";
import { LANDING } from "@/lib/copy";
import { TrackView } from "@/components/app/track-view";
import { RouteHome } from "./route-home";

export default function Home() {
  const c = getCatalog();
  const cities = new Set(c.universities.map((u) => u.city)).size;
  return (
    <div className="space-y-12 pt-6">
      <TrackView event="landing_view" />
      <RouteHome />
      <section id="data" aria-labelledby="data-h" className="space-y-4">
        <h2 id="data-h" className="flex items-center gap-2 text-2xl font-bold"><Database className="h-6 w-6 text-primary" /> {LANDING.dataTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 pt-5 text-sm">
              <p className="font-medium">{LANDING.dataNow}</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <li>{LANDING.stats.regions(c.regions.filter((r) => r.id !== "abroad").length)}</li>
                <li>{LANDING.stats.specialties(c.specialties.length)}</li>
                <li>{LANDING.stats.professions(c.professions.length)}</li>
                <li>{LANDING.stats.universities(c.universities.length)}</li>
                <li>{LANDING.stats.cities(cities)}</li>
                <li>{LANDING.stats.programs(c.programs.length)}</li>
              </ul>
              <p className="pt-2 font-medium">{LANDING.dataSources}</p>
              <ul className="list-inside list-disc text-muted-foreground">{LANDING.sources.map((s) => <li key={s}>{s}</li>)}</ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-ok" /> {LANDING.honestyTitle}</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">{LANDING.honesty.map((s) => <li key={s}>{s}</li>)}</ul>
              <Link href="/data-gaps" className="inline-block text-primary hover:underline">{LANDING.gapsLink}</Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
