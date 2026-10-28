import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCatalog } from "@/lib/db/catalog";
import { OutlookBadge } from "@/components/app/outlook-badge";
import { SourceMark } from "@/components/app/source-mark";
import { ProfilePrograms } from "@/components/app/profile-programs";
import { pct, rubK } from "@/lib/utils";
import { SUBJECT_NOM, yearsWord } from "@/lib/engine/ru";
import { CARD, COMMON, DVI_TEXT, EXAMS, NOT_FOUND, SPECIALTY } from "@/lib/copy";
import { Term } from "@/components/app/term";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = getCatalog().specialties.find((x) => x.code === decodeURIComponent(code));
  return { title: s ? `${s.code} ${s.name}` : NOT_FOUND.title };
}

export default async function SpecialtyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw);
  const c = getCatalog();
  const spec = c.specialties.find((s) => s.code === code);
  if (!spec) notFound();
  const profs = c.professions.filter((p) => p.specialties.includes(code)).sort((a, b) => b.salary.middle - a.salary.middle);
  const levelKey = spec.level === "spo" ? "spo" : spec.level === "specialist" ? "specialist" : "bachelor";

  return (
    <div className="space-y-6 pt-6" data-testid="specialty-page">
      <Link href="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {COMMON.toResults}</Link>
      <div>
        <p className="text-sm text-muted-foreground">{SPECIALTY.code(spec.code)}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{spec.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge><Term k={levelKey} /></Badge>
          <Badge variant="secondary">{yearsWord(spec.years)}{spec.level === "spo" && ` ${SPECIALTY.afterSchool}`}</Badge>
          <Badge variant="outline">{SPECIALTY.employment(pct(spec.employment.rate))} <SourceMark source={spec.employment.meta.source} confidence={spec.employment.meta.confidence} /></Badge>
        </div>
        <p className="mt-3 max-w-3xl text-muted-foreground">{spec.description}</p>
        {spec.autoDescription && <p className="mt-1 text-xs text-muted-foreground" data-testid="auto-description">{SPECIALTY.autoDescription}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4" /> {SPECIALTY.exams}</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {spec.level === "spo" ? (
              <p>{SPECIALTY.spoExams}</p>
            ) : (
              <ul className="list-inside list-disc space-y-1">
                {spec.ege.mandatory.map((s) => <li key={s}>{SUBJECT_NOM[s] ?? s}</li>)}
                {spec.ege.oneOf.length > 0 && <li>{SPECIALTY.choice(spec.ege.oneOf.map((s) => SUBJECT_NOM[s] ?? s).join(" / "))}</li>}
                <li data-testid="spec-dvi">{spec.dvi ? EXAMS.dvi(DVI_TEXT[spec.dvi].label) : EXAMS.dviNone}</li>
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{SPECIALTY.examsNote}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> {SPECIALTY.disciplines}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">{spec.disciplines.map((d) => <Badge key={d} variant="secondary">{d}</Badge>)}</CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{SPECIALTY.jobs}</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {profs.map((p) => (
            <Link key={p.id} href={`/profession/${p.id}`} className="rounded-lg border bg-card p-3 hover:bg-muted" data-testid="specialty-profession-link">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <OutlookBadge status={p.outlook.status} />
              </div>
              <p className="mt-1 text-sm">{SPECIALTY.example(p.tasks[0])}</p>
              <p className="mt-1 text-xs text-muted-foreground">{CARD.salary5}: ~{rubK(p.salary.middle)} {p.earlyEntryCourse !== null && p.earlyEntryCourse <= 2 && `· ${CARD.earlyWork(p.earlyEntryCourse)}`}</p>
            </Link>
          ))}
        </div>
      </section>

      <ProfilePrograms specialtyCode={spec.code} />
    </div>
  );
}
