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
import { FORM_LABEL } from "@/lib/engine/vocab";
import { rubK } from "@/lib/utils";
import { yearsWord } from "@/lib/engine/ru";
import { HowToGet } from "./how-to-get";

const FEATURE: Record<string, string> = {
  dual: "дуальное обучение", internships: "стажировки с работодателями", evening: "вечерняя / очно-заочная форма", online: "онлайн-обучение",
  target: "целевое обучение", intl: "международные обмены", studlife: "активная студжизнь", career: "центр карьеры", olymp: "олимпиады для школьников",
};
const SCHEDULE = { morning: "утро", evening: "вечер", dense: "плотное", free: "свободное" } as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = getCatalog().universities.find((x) => x.id === id);
  return { title: u ? `${u.short} — Траектория` : "Вуз не найден" };
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
    <div className="space-y-6 pt-6" data-testid="university-page">
      <Link href="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> К результатам</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{uni.short}</h1>
          <p className="text-muted-foreground">{uni.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline"><MapPin className="h-3 w-3" /> {uni.city}</Badge>
            {uni.abroad && <Badge variant="yellow">за рубежом</Badge>}
            {uni.type === "college" && <Badge variant="secondary">колледж (СПО)</Badge>}
            <Badge variant={uni.dorm ? "green" : "outline"}><Home className="h-3 w-3" /> {uni.dorm ? "есть общежитие" : "нет общежития"}</Badge>
            <Badge variant={uni.vuc ? "green" : "outline"}><Shield className="h-3 w-3" /> {uni.vuc ? "есть ВУЦ" : "нет ВУЦ"}</Badge>
          </div>
        </div>
        <PlanButton kind="universities" id={uni.id} size="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> О вузе</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{uni.description}</p>
            <div className="flex flex-wrap gap-1.5">{uni.features.map((f) => <Badge key={f} variant="secondary">{FEATURE[f] ?? f}</Badge>)}</div>
            <p className="text-muted-foreground">
              Стоимость: {uni.priceFrom === null ? "обучение за счёт вуза/работодателя или по грантам" : uni.priceFrom === 0 ? "почти бесплатно (семестровый взнос)" : `~${rubK(uni.priceFrom)}–${rubK(uni.priceTo)} в год`}{" "}
              <SourceMark source={uni.priceMeta.source} confidence={uni.priceMeta.confidence} updatedAt={uni.priceMeta.updatedAt} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4" /> Рейтинги и отзывы</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>RAEX-100: {uni.ratings.raex ? `≈ ${uni.ratings.raex} место` : "не входит / нет данных"} <SourceMark source={uni.ratings.meta.source} confidence={uni.ratings.meta.confidence} /></p>
            <p>Рейтинг у работодателей: {Math.round(uni.ratings.employers * 100)} / 100 <SourceMark source={uni.ratings.meta.source} confidence="estimate" /></p>
            <div className="flex flex-col gap-1 pt-1">
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={q("vuzopedia.ru")} target="_blank" rel="noopener noreferrer">Вузопедия <ExternalLink className="h-3 w-3" /></a>
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={q("postupi.online")} target="_blank" rel="noopener noreferrer">«Поступи онлайн» <ExternalLink className="h-3 w-3" /></a>
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={uni.site} target="_blank" rel="noopener noreferrer">Официальный сайт <ExternalLink className="h-3 w-3" /></a>
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={uni.admissionUrl} target="_blank" rel="noopener noreferrer">Приёмная комиссия <ExternalLink className="h-3 w-3" /></a>
            </div>
          </CardContent>
        </Card>
      </div>

      <HowToGet city={uni.city} howToGet={uni.howToGet} />

      <Card>
        <CardHeader><CardTitle className="text-base">Программы ({programs.length})</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {programs.map((p) => (
            <div key={p.id} className="rounded-lg border p-3 text-sm" data-testid="uni-program">
              <Link href={`/specialty/${p.specialtyCode}`} className="font-medium hover:underline">{p.specialtyCode} {p.name}</Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.forms.map((f) => FORM_LABEL[f]).join(", ")} · расписание: {SCHEDULE[p.schedule]} · {yearsWord(spec.get(p.specialtyCode)?.years ?? 4)}
              </p>
              <p className="mt-1 text-xs">
                Основные предметы: {p.keySubjects.join(", ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.passScore.min !== null ? <>Проходной бюджет ≈ {p.passScore.min > 300 ? `${(p.passScore.min / 100).toFixed(1)}–${((p.passScore.max ?? p.passScore.min) / 100).toFixed(1)} (ср. балл)` : `${p.passScore.min}–${p.passScore.max}`} <SourceMark source={p.passScore.meta.source} confidence={p.passScore.meta.confidence} /> · </> : null}
                бюджет: {p.budgetPlaces > 0 ? `~${p.budgetPlaces} мест` : "нет"}{p.targetPlaces > 0 && `, целевых ~${p.targetPlaces}`} · {p.price === null ? "за счёт работодателя" : `платно ~${rubK(p.price)}/год`}{" "}
                <SourceMark source={p.meta.source} confidence={p.meta.confidence} />
              </p>
              {p.partners.length > 0 && <p className="mt-1 text-xs">Партнёры и стажировки: {p.partners.join(", ")}{p.dual && " · дуальное обучение"}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <ProfilePrograms universityId={uni.id} title="Твой шанс поступления на программы этого вуза" />

      <section className="space-y-3" aria-labelledby="vibe">
        <h2 id="vibe" className="flex items-center gap-2 text-lg font-semibold"><CalendarHeart className="h-5 w-5 text-primary" /> Почувствуй вайб</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <EventsBlock universityId={uni.id} />
          <ExplainBlock entityType="university" entityId={uni.id} variant="university" />
        </div>
      </section>
    </div>
  );
}
