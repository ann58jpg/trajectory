"use client";
import Link from "next/link";
import { Star } from "lucide-react";
import { useMarkChapter } from "@/components/app/use-route";
import { TestFirstHint } from "@/components/app/test-first-hint";
import { LifeCore } from "@/components/app/life-core";
import { EventsBlock } from "@/components/app/events-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { usePlan, useProfile } from "@/lib/storage";
import { LIFE } from "@/lib/copy";

type U = { id: string; short: string; site: string; city: string };

export function ChapterView({ universities }: { universities: U[] }) {
  useMarkChapter(4);
  const [p] = useProfile();
  const [plan, , ready] = usePlan();
  const by = new Map(universities.map((u) => [u.id, u]));
  const fav = plan.universities.map((id) => by.get(id)).filter((u): u is U => u !== undefined);
  return (
    <div className="space-y-4 pt-2" data-testid="chapter-life">
      {!p.consent && <TestFirstHint />}
      <h1 className="text-2xl font-bold sm:text-3xl">{LIFE.title}</h1>
      <p className="text-muted-foreground">{LIFE.lead}</p>
      {!ready ? <Skeleton className="h-40" /> : fav.length === 0 ? (
        <Card data-testid="life-empty">
          <CardContent className="space-y-3 p-6">
            <p className="flex items-center gap-2"><Star className="h-5 w-5 text-warn" /> {LIFE.emptyFav}</p>
            <Link href="/universities" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground">{LIFE.toUnis}</Link>
          </CardContent>
        </Card>
      ) : (
        fav.map((u) => (
          <Card key={u.id} data-testid="life-uni">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">{u.short} · <span className="font-normal text-muted-foreground">{u.city}</span></CardTitle>
              <Link href={`/university/${u.id}`} className="text-sm text-primary hover:underline">{LIFE.openUni}</Link>
            </CardHeader>
            <CardContent>
              <LifeCore universityId={u.id} site={u.site} name={u.short}>
                <div className="space-y-2">
                  <h3 className="font-semibold">{LIFE.upcoming}</h3>
                  <EventsBlock universityId={u.id} />
                </div>
              </LifeCore>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
