import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, MapPin, Scale, Sparkles, TrendingUp, ShieldCheck, Database, CalendarHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCatalog } from "@/lib/db/catalog";
import { LANDING } from "@/lib/copy";

const STEP_ICONS = [ClipboardList, BarChart3, Scale];
const FEATURE_ICONS = [MapPin, TrendingUp, CalendarHeart];

export default function Home() {
  const c = getCatalog();
  const cities = new Set(c.universities.map((u) => u.city)).size;
  return (
    <div className="space-y-16">
      <section className="hero-bg -mx-4 px-4 pb-10 pt-12 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">{LANDING.badge}</Badge>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {LANDING.h1a} <span className="gradient-text">{LANDING.h1b}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">{LANDING.lead}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/quiz" data-testid="start-quiz">
                {LANDING.cta} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#example">{LANDING.example}</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{LANDING.privacy}</p>
        </div>
      </section>

      <section aria-labelledby="how" className="space-y-6">
        <h2 id="how" className="text-2xl font-bold">{LANDING.howTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {LANDING.steps.map(({ title, text }, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <Card key={title}>
                <CardHeader>
                  <Icon className="h-7 w-7 text-primary" />
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="example" aria-labelledby="example-h" className="space-y-4">
        <h2 id="example-h" className="text-2xl font-bold">{LANDING.exampleTitle}</h2>
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-5">
            <p className="text-sm text-muted-foreground">{LANDING.examplePortrait}</p>
            <p className="font-medium">{LANDING.examplePortraitText}</p>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> {LANDING.exampleInterests}</div>
              {LANDING.exampleCards.map((c) => (
                <div key={c.title} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.title}</span>
                    <Badge variant="secondary">{c.badge}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t p-5 sm:border-l sm:border-t-0">
              <div className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> {LANDING.exampleChange}</div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">{LANDING.exampleTradeoff}</div>
              <p className="text-xs text-muted-foreground">{LANDING.exampleNote}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {LANDING.features.map(({ title, text }, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <div key={title} className="flex gap-3 rounded-lg border bg-card p-4">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section id="data" aria-labelledby="data-h" className="space-y-4">
        <h2 id="data-h" className="flex items-center gap-2 text-2xl font-bold"><Database className="h-6 w-6 text-primary" /> {LANDING.dataTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 pt-5 text-sm">
              <p className="font-medium">{LANDING.dataNow}</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <li>{c.regions.filter((r) => r.id !== "abroad").length} регионов</li>
                <li>{c.specialties.length} направлений учёбы</li>
                <li>{c.professions.length} профессий</li>
                <li>{c.universities.length} вузов и колледжей</li>
                <li>{cities} городов</li>
                <li>{c.programs.length} программ</li>
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
