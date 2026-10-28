import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarHeart, ExternalLink, Home, MapPin, Shield, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCatalog } from "@/lib/db/catalog";
import { SourceMark } from "@/components/app/source-mark";
import { PlanButton } from "@/components/app/plan-button";
import { ProfilePrograms } from "@/components/app/profile-programs";
import { ExplainBlock } from "@/components/app/explain-block";
import { EventsBlock } from "@/components/app/events-block";
import { CompareToggle } from "@/components/app/compare";
import { Term } from "@/components/app/term";
import { TrackView } from "@/components/app/track-view";
import { COMMON, FORM_TEXT, NOT_FOUND, PROFILE_PROGRAMS, PROGRAM, UNIVERSITY } from "@/lib/copy";
import { examSetText } from "@/lib/engine/exams";
import { rubK } from "@/lib/utils";
import { yearsWord } from "@/lib/engine/ru";
import { HowToGet } from "./how-to-get";
import { BudgetValue, PassValue } from "@/components/app/pass-score";
import { officialScore } from "@/lib/engine/scoring";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = getCatalog().universities.find((x) => x.id === id);
  return { title: u ? u.short : NOT_FOUND.title };
}

export default async function UniversityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCatalog();
  const uni = c.universities.find((u) => u.id === id);
  if (!uni) notFound();
  const programs = c.programs.filter((p) => p.universityId === id);
  const spec = new Map(c.specialties.map((s) => [s.code, s]));
  const q = (site: string) => `https://yandex.ru/search/?text=${encodeURIComponent(`site:${site} ${uni.name}`)}`;

  return (
    <div className="space-y-8 pt-6" data-testid="university-page">
      <TrackView event="university_open" props={{ universityId: uni.id }} />
      <Link href="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {COMMON.toResults}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{uni.short}</h1>
          <p className="text-muted-foreground">{uni.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline"><MapPin className="h-3 w-3" /> {uni.city}</Badge>
            {uni.abroad && <Badge variant="yellow">{UNIVERSITY.abroad}</Badge>}
            {uni.type === "college" && <Badge variant="secondary"><Term k="spo">{UNIVERSITY.college}</Term></Badge>}
            <Badge variant={uni.dorm ? "green" : "outline"}><Home className="h-3 w-3" /> {uni.dorm ? UNIVERSITY.dorm.yes : UNIVERSITY.dorm.no}</Badge>
            <Badge variant={uni.vuc ? "green" : "outline"}><Shield className="h-3 w-3" /> <Term k="vuc">{uni.vuc ? UNIVERSITY.vuc.yes : UNIVERSITY.vuc.no}</Term></Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <CompareToggle kind="university" id={uni.id} />
          <PlanButton kind="universities" id={uni.id} size="default" />
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="vibe">
        <h2 id="vibe" className="flex items-center gap-2 text-lg font-semibold"><CalendarHeart className="h-5 w-5 text-primary" /> {UNIVERSITY.vibeTitle}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <EventsBlock universityId={uni.id} />
          <ExplainBlock entityType="university" entityId={uni.id} variant="university" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> {UNIVERSITY.about}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{uni.description}</p>
            <div className="flex flex-wrap gap-1.5">{uni.features.map((f) => <Badge key={f} variant="secondary">{UNIVERSITY.features[f] ?? f}</Badge>)}</div>
            <p className="text-muted-foreground">
              {UNIVERSITY.price}:{" "}
              {uni.priceFrom === null ? UNIVERSITY.priceSponsored : uni.priceFrom === 0 ? UNIVERSITY.priceAbroad : `~${rubK(uni.priceFrom)}–${rubK(uni.priceTo)} ${COMMON.perYear}`}{" "}
              <SourceMark source={uni.priceMeta.source} confidence={uni.priceMeta.confidence} updatedAt={uni.priceMeta.updatedAt} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4" /> {UNIVERSITY.ratings}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{UNIVERSITY.raex(uni.ratings.raex ? `≈ ${uni.ratings.raex}` : UNIVERSITY.raexNone)} <SourceMark source={uni.ratings.meta.source} confidence={uni.ratings.meta.confidence} /></p>
            <p>{UNIVERSITY.employers(Math.round(uni.ratings.employers * 100))} <SourceMark source={uni.ratings.meta.source} confidence="estimate" /></p>
            <div className="flex flex-col gap-1 pt-1">
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={q("vuzopedia.ru")} target="_blank" rel="noopener noreferrer">{UNIVERSITY.links.vuzopedia} <ExternalLink className="h-3 w-3" /></a>
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={q("postupi.online")} target="_blank" rel="noopener noreferrer">{UNIVERSITY.links.postupi} <ExternalLink className="h-3 w-3" /></a>
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={uni.site} target="_blank" rel="noopener noreferrer">{UNIVERSITY.links.site} <ExternalLink className="h-3 w-3" /></a>
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={uni.admissionUrl} target="_blank" rel="noopener noreferrer">{UNIVERSITY.links.admission} <ExternalLink className="h-3 w-3" /></a>
            </div>
          </CardContent>
        </Card>
      </div>

      <HowToGet city={uni.city} howToGet={uni.howToGet} />

      <ProfilePrograms universityId={uni.id} title={PROFILE_PROGRAMS.uniTitle} />

      <Card>
        <CardHeader><CardTitle className="text-base">{UNIVERSITY.programs(programs.length)}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {programs.map((p) => {
            const s = spec.get(p.specialtyCode);
            return (
              <div key={p.id} className="space-y-1 rounded-lg border p-3 text-sm" data-testid="uni-program">
                <Link href={`/specialty/${p.specialtyCode}`} className="font-medium hover:underline">{p.specialtyCode} {p.name}</Link>
                <p className="text-xs text-muted-foreground">
                  {p.forms.map((f) => FORM_TEXT[f]).join(", ")} · {UNIVERSITY.scheduleLabel}: {UNIVERSITY.schedule[p.schedule]} · {yearsWord(s?.years ?? 4)}
                </p>
                {s && <p className="text-xs" data-testid="exam-set">{PROGRAM.exams}: {examSetText(s, p)}</p>}
                <p className="text-xs">{UNIVERSITY.keySubjects}: {p.keySubjects.join(", ")}</p>
                <p><PassValue official={officialScore(p)} min={p.passScore.min} max={p.passScore.max} confidence={p.passScore.meta.confidence} /></p>
                <p className="text-xs text-muted-foreground">
                  <BudgetValue places={p.budgetPlaces} />
                  {(p.targetPlaces ?? 0) > 0 && <> · <Term k="target">+{p.targetPlaces}</Term></>} · {p.price === null ? PROGRAM.sponsored : PROGRAM.paid(rubK(p.price))}{" "}
                  <SourceMark source={p.meta.source} confidence={p.meta.confidence} />
                </p>
                {p.partners.length > 0 && <p className="text-xs">{UNIVERSITY.partners}: {p.partners.join(", ")}{p.dual && <> · <Term k="dual" /></>}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
