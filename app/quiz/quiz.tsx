"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Lock, RotateCcw, Search, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip, Input, Progress, Textarea } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { KEYS, readLS, removeLS, useProfile, writeLS } from "@/lib/client/storage";
import { emptyProfile, type LikeReason, type StudentProfile } from "@/lib/schemas";
import { ACHIEVEMENTS, BENEFITS, GUIDES, HOBBIES, LIKE_REASONS, UNI_CRITERIA, WORK_FORMATS } from "@/lib/engine/vocab";
import { GAME_ROUNDS } from "@/lib/engine/game";
import { GameStep } from "./steps/game-step";
import { QUIZ } from "@/lib/copy";
import { DviStep, EgeStep, withRus } from "./steps/ege-step";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

type Props = {
  regions: { id: string; name: string; cities: string[] }[];
  universities: { id: string; short: string; name: string; city: string; abroad: boolean; aliases: string[] }[];
  subjects: { id: string; name: string }[];
};

type Step = {
  id: string;
  block: "Старт" | "A. Отправная точка" | "B. География и условия" | "C. Школа и ЕГЭ" | "D. Интересы" | "E. Вузы" | "Готово";
  title: string;
  hint?: string;
  answered: (p: StudentProfile) => boolean;
  render: () => React.ReactNode;
  skip?: (p: StudentProfile) => boolean;
};

const toggle = <T,>(arr: T[], v: T, max?: number) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : max && arr.length >= max ? arr : [...arr, v];

export function Quiz({ regions, universities, subjects }: Props) {
  const router = useRouter();
  const [p, setP, ready] = useProfile();
  const [i, setI] = useState(0);
  const [regionQuery, setRegionQuery] = useState("");
  const [uniQuery, setUniQuery] = useState("");

  useEffect(() => {
    if (ready) setI(readLS(KEYS.step, z.number().int().min(0), 0));
  }, [ready]);
  useEffect(() => {
    if (ready) writeLS(KEYS.step, i);
  }, [i, ready]);

  const up = (patch: Partial<StudentProfile>) => setP((prev) => ({ ...prev, ...patch }));
  useEffect(() => {
    if (ready && !p.ege.some((e) => e.subject === "rus")) setP((prev) => ({ ...prev, ege: withRus(prev.ege) }));
  }, [ready, p.ege, setP]);
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;

  const fillPersona = (id: PersonaId) => {
    setP(PERSONAS[id].profile);
    setI(steps.length - 1);
  };

  const steps: Step[] = useMemo(() => {
    const list: Step[] = [
      {
        id: "consent",
        block: "Старт",
        title: "Перед началом",
        answered: (p) => p.consent,
        render: () => (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
              <p className="mb-2 flex items-center gap-2 font-medium"><Lock className="h-4 w-4 text-primary" /> Коротко о данных</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {QUIZ.consent.privacy.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
            <Chip selected={p.consent} onClick={() => up({ consent: !p.consent })} className="flex w-full items-center gap-3">
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded border", p.consent && "border-primary bg-primary text-primary-foreground")}>
                {p.consent && <Check className="h-3.5 w-3.5" />}
              </span>
              {QUIZ.consent.agree}
            </Chip>
            <div className="space-y-2 pt-2">
              <p className="flex items-center gap-2 text-sm font-medium"><Wand2 className="h-4 w-4 text-primary" /> Или посмотри на примере — заполнить анкету за тестового школьника:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`persona-${id}`}
                    onClick={() => fillPersona(id)}
                    className="cursor-pointer rounded-lg border bg-card p-3 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{PERSONAS[id].title}</span>
                    <span className="block text-xs text-muted-foreground">{PERSONAS[id].subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "start",
        block: "A. Отправная точка",
        title: QUIZ.start.title,
        hint: QUIZ.start.hint,
        answered: (p) => p.start !== null,
        render: () => (
          <div className="grid gap-2">
            {(Object.entries(QUIZ.start.options) as [NonNullable<StudentProfile["start"]>, string][]).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.start === v} onClick={() => up({ start: v })}>{l}</Chip>
            ))}
          </div>
        ),
      },
      {
        id: "guides",
        block: "A. Отправная точка",
        title: "Главный ориентир сейчас",
        hint: "Выбери до трёх.",
        answered: (p) => p.guides.length > 0 || p.guideOther.trim().length > 0,
        render: () => (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {GUIDES.map((g) => (
                <Chip key={g.id} selected={p.guides.includes(g.id)} disabled={!p.guides.includes(g.id) && p.guides.length >= 3} onClick={() => up({ guides: toggle(p.guides, g.id, 3) })}>
                  {g.label}
                </Chip>
              ))}
            </div>
            <Input placeholder="Свой вариант" value={p.guideOther} maxLength={200} onChange={(e) => up({ guideOther: e.target.value })} aria-label="Свой вариант ориентира" />
          </div>
        ),
      },
      {
        id: "horizon",
        block: "A. Отправная точка",
        title: QUIZ.horizon.title,
        hint: QUIZ.horizon.hint,
        answered: (p) => p.moneyHorizon !== null,
        render: () => (
          <div className="grid gap-2">
            {(Object.entries(QUIZ.horizon.options) as [NonNullable<StudentProfile["moneyHorizon"]>, string][]).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.moneyHorizon === v} onClick={() => up({ moneyHorizon: v })}>{l}</Chip>
            ))}
          </div>
        ),
      },
      {
        id: "region",
        block: "B. География и условия",
        title: "Где ты живёшь?",
        hint: QUIZ.region.hint,
        answered: (p) => p.regionId !== null,
        render: () => {
          const q = regionQuery.trim().toLowerCase();
          const filtered = regions.filter((r) => !q || r.name.toLowerCase().includes(q) || r.cities.some((c) => c.toLowerCase().includes(q)));
          const region = regions.find((r) => r.id === p.regionId);
          return (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Поиск региона или города" value={regionQuery} onChange={(e) => setRegionQuery(e.target.value)} aria-label="Поиск региона" />
              </div>
              <div className="grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2" role="radiogroup" aria-label="Регион">
                {filtered.map((r) => (
                  <Chip key={r.id} role="radio" selected={p.regionId === r.id} onClick={() => up({ regionId: r.id, city: r.cities[0] })}>{r.name}</Chip>
                ))}
                {!filtered.length && <p className="text-sm text-muted-foreground">Не нашли регион? Выбери ближайший — данные по нему будут ближе всего.</p>}
              </div>
              {region && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Город</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Город">
                    {region.cities.map((c) => (
                      <Chip key={c} role="radio" selected={p.city === c} onClick={() => up({ city: c })}>{c}</Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "relocation",
        block: "B. География и условия",
        title: "Готов(а) ли переехать ради учёбы?",
        hint: QUIZ.relocation.hint,
        answered: (p) => p.relocation !== null,
        render: () => (
          <div className="grid gap-2">
            {(Object.entries(QUIZ.relocation.options) as [NonNullable<StudentProfile["relocation"]>, string][]).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.relocation === v} onClick={() => up({ relocation: v })}>{l}</Chip>
            ))}
          </div>
        ),
      },
      {
        id: "dorm",
        block: "B. География и условия",
        title: "Нужно ли общежитие?",
        answered: (p) => p.dorm !== null,
        render: () => (
          <div className="flex flex-wrap gap-2">
            {([["yes", "Да"], ["no", "Нет"], ["unknown", "Не знаю"]] as const).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.dorm === v} onClick={() => up({ dorm: v })}>{l}</Chip>
            ))}
          </div>
        ),
      },
      {
        id: "finance",
        block: "B. География и условия",
        title: "Финансы и льготы",
        answered: (p) => p.finance !== null,
        render: () => (
          <div className="space-y-4">
            <div className="grid gap-2">
              {([
                ["budget", "Только бюджет"],
                ["budget_or_paid", "Бюджет, но рассмотрю платное до суммы ниже"],
                ["paid", "Готов(а) к платному"],
                ["credit", "Рассматриваю образовательный кредит"],
              ] as const).map(([v, l]) => (
                <Chip key={v} role="radio" selected={p.finance === v} onClick={() => up({ finance: v })}>{l}</Chip>
              ))}
            </div>
            {p.finance === "budget_or_paid" && (
              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-sm">Платное — не дороже <b>{p.paidLimit.toLocaleString("ru-RU")} ₽ в год</b></p>
                <Slider value={[p.paidLimit]} min={50000} max={1000000} step={10000} onValueChange={([v]) => up({ paidLimit: v })} thumbLabel="Лимит стоимости в год" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Есть ли льготы? (можно несколько)</p>
              <div className="flex flex-wrap gap-2">
                {BENEFITS.map((b) => (
                  <Chip key={b.id} selected={p.benefits.includes(b.id)} onClick={() => up({ benefits: toggle(p.benefits, b.id) })}>{b.label}</Chip>
                ))}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "gender",
        block: "B. География и условия",
        title: "Пол (необязательно)",
        hint: QUIZ.gender.hint,
        answered: (p) => p.gender !== null,
        render: () => (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([["m", "Мужской"], ["f", "Женский"], ["skip", "Не хочу указывать"]] as const).map(([v, l]) => (
                <Chip key={v} role="radio" selected={p.gender === v} onClick={() => up({ gender: v, vucImportant: v === "m" ? p.vucImportant : null })}>{l}</Chip>
              ))}
            </div>
            {p.gender === "m" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{QUIZ.gender.vuc}</p>
                <div className="flex flex-wrap gap-2">
                  {([["yes", "Да, обязательно"], ["no", "Нет"], ["unknown", "Не знаю"]] as const).map(([v, l]) => (
                    <Chip key={v} role="radio" selected={p.vucImportant === v} onClick={() => up({ vucImportant: v })}>{l}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
      },
      {
        id: "egeOrder",
        block: "C. Школа и ЕГЭ",
        title: "Как ты выбираешь предметы ЕГЭ?",
        answered: (p) => p.egeOrder !== null,
        render: () => (
          <div className="grid gap-2">
            {([
              ["chosen", "Я уже выбрал(а) предметы ЕГЭ"],
              ["by_goal", "Знаю вуз или профессию и подберу предметы под них"],
              ["undecided", "Ещё не решил(а)"],
            ] as const).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.egeOrder === v} onClick={() => up({ egeOrder: v })}>{l}</Chip>
            ))}
            {p.egeOrder && p.egeOrder !== "chosen" && (
              <p className="rounded-lg bg-primary/8 p-3 text-sm">
                Хорошо — на экране результатов покажем, какие предметы нужны под каждую подходящую профессию. Ниже можно отметить предметы, которые ты рассматриваешь.
              </p>
            )}
          </div>
        ),
      },
      {
        id: "ege",
        block: "C. Школа и ЕГЭ",
        title: QUIZ.ege.title,
        hint: QUIZ.ege.hint,
        answered: (p) => p.ege.some((e) => e.subject !== "rus") && p.ege.some((e) => e.subject === "rus" && e.score !== null),
        render: () => <EgeStep p={p} up={up} subjects={subjects} />,
      },
      {
        id: "dvi",
        block: "C. Школа и ЕГЭ",
        title: QUIZ.dvi.title,
        hint: QUIZ.dvi.hint,
        answered: (p) => p.dviReady.length > 0,
        render: () => <DviStep p={p} up={up} />,
      },
      {
        id: "grade",
        block: "C. Школа и ЕГЭ",
        title: "Класс и средний балл",
        answered: (p) => p.grade !== null,
        render: () => (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([["9", "9 класс"], ["10", "10 класс"], ["11", "11 класс"], ["grad", "Выпускник прошлых лет"]] as const).map(([v, l]) => (
                <Chip key={v} role="radio" selected={p.grade === v} onClick={() => up({ grade: v })}>{l}</Chip>
              ))}
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Средний балл аттестата / успеваемости</span>
                <b className="tabular-nums">{p.gpa?.toFixed(1) ?? "не указан"}</b>
              </div>
              <Slider value={[p.gpa ?? 4]} min={3} max={5} step={0.1} onValueChange={([v]) => up({ gpa: Math.round(v * 10) / 10 })} thumbLabel="Средний балл" />
              <p className="text-xs text-muted-foreground">{QUIZ.grade.gpaHint}</p>
            </div>
          </div>
        ),
      },
      {
        id: "likes",
        block: "C. Школа и ЕГЭ",
        title: "Какие предметы нравятся или получаются — и почему?",
        hint: QUIZ.likes.hint,
        answered: (p) => Object.keys(p.subjectLikes).length > 0,
        render: () => {
          const ids = Array.from(new Set([...p.ege.map((e) => e.subject), ...Object.keys(p.subjectLikes)]));
          const extra = subjects.filter((s) => !ids.includes(s.id));
          return (
            <div className="space-y-3">
              {ids.map((id) => (
                <div key={id} className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium">{subjName(id)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {LIKE_REASONS.map((r) => {
                      const cur = p.subjectLikes[id] ?? [];
                      const sel = cur.includes(r.id);
                      return (
                        <Chip
                          key={r.id}
                          className="min-h-9 px-2.5 py-1 text-xs"
                          selected={sel}
                          onClick={() => {
                            const next = toggle<LikeReason>(cur, r.id);
                            const likes = { ...p.subjectLikes };
                            if (next.length) likes[id] = next;
                            else delete likes[id];
                            up({ subjectLikes: likes });
                          }}
                        >
                          {r.label}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              ))}
              {extra.length > 0 && (
                <details className="rounded-lg border p-3 text-sm">
                  <summary className="cursor-pointer">Добавить другой предмет, который нравится</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {extra.map((s) => (
                      <Chip key={s.id} selected={false} onClick={() => up({ subjectLikes: { ...p.subjectLikes, [s.id]: ["intrinsic"] } })}>{s.name}</Chip>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        },
      },
      {
        id: "achievements",
        block: "C. Школа и ЕГЭ",
        title: "Достижения",
        answered: (p) => p.olympiad !== "none" || p.achievements.length > 0 || p.achievementsOther.trim().length > 0,
        render: () => (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Олимпиады — высший уровень</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ["none", "Не участвовал(а)"], ["school", "Школьный"], ["municipal", "Муниципальный"],
                  ["regional", "Региональный"], ["final", "Финал всероссийской"], ["listed", "Олимпиады вузов из перечня"],
                ] as const).map(([v, l]) => (
                  <Chip key={v} role="radio" selected={p.olympiad === v} onClick={() => up({ olympiad: v })}>{l}</Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENTS.map((a) => (
                <Chip key={a.id} selected={p.achievements.includes(a.id)} onClick={() => up({ achievements: toggle(p.achievements, a.id) })}>{a.label}</Chip>
              ))}
            </div>
            <Input placeholder="Свой вариант (например, «призёр хакатона по робототехнике»)" value={p.achievementsOther} maxLength={300} onChange={(e) => up({ achievementsOther: e.target.value })} aria-label="Свой вариант достижения" />
          </div>
        ),
      },
      {
        id: "hobbies",
        block: "D. Интересы",
        title: QUIZ.hobbies.title,
        hint: QUIZ.hobbies.hint,
        answered: (p) => p.hobbies.length > 0 || p.hobbyOther.trim().length > 0,
        render: () => (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {HOBBIES.map((h) => (
                <Chip key={h.id} selected={p.hobbies.includes(h.id)} onClick={() => up({ hobbies: toggle(p.hobbies, h.id) })}>{h.label}</Chip>
              ))}
            </div>
            <Input placeholder={QUIZ.hobbies.other} value={p.hobbyOther} maxLength={200} onChange={(e) => up({ hobbyOther: e.target.value })} aria-label={QUIZ.hobbies.other} />
          </div>
        ),
      },
      {
        id: "game",
        block: "D. Интересы",
        title: QUIZ.game.title,
        hint: QUIZ.game.hint,
        answered: (p) => p.game.filter((r) => r.pick).length >= GAME_ROUNDS,
        render: () => <GameStep rounds={p.game} onChange={(game) => up({ game })} />,
      },
      {
        id: "formats",
        block: "D. Интересы",
        title: QUIZ.formats.title,
        hint: QUIZ.formats.hint,
        answered: (p) => p.workFormats.length > 0,
        render: () => (
          <div className="flex flex-wrap gap-2">
            {WORK_FORMATS.map((f) => (
              <Chip key={f.id} selected={p.workFormats.includes(f.id)} onClick={() => up({ workFormats: toggle(p.workFormats, f.id) })}>{f.label}</Chip>
            ))}
          </div>
        ),
      },
      {
        id: "dream",
        block: "D. Интересы",
        title: "Кем хочешь стать и почему? Своими словами",
        hint: QUIZ.dream.hint,
        answered: (p) => p.dream.trim().length >= 10,
        render: () => (
          <div className="space-y-2">
            <Textarea value={p.dream} maxLength={2000} placeholder="Например: «Люблю собирать технику и хочу хорошо зарабатывать, но боюсь, что не потяну физику…»" onChange={(e) => up({ dream: e.target.value })} aria-label="Кем хочешь стать" />
            <p className="text-right text-xs text-muted-foreground">{p.dream.length}/2000</p>
          </div>
        ),
      },
      {
        id: "unis",
        block: "E. Вузы",
        title: "Какие вузы рассматриваешь?",
        hint: "Можно несколько или «пока никакие».",
        answered: (p) => p.universities.length > 0,
        render: () => {
          const q = uniQuery.trim().toLowerCase();
          const filtered = universities.filter((u) => !q || [u.short, u.name, u.city, ...u.aliases].some((x) => x.toLowerCase().includes(q)));
          return (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Поиск: МФТИ, Бауманка, Казань…" value={uniQuery} onChange={(e) => setUniQuery(e.target.value)} aria-label="Поиск вуза" />
              </div>
              {p.universities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.universities.map((id) => (
                    <Badge key={id} variant="default" className="gap-1 py-1">
                      {universities.find((u) => u.id === id)?.short}
                      <button type="button" aria-label="Убрать" className="cursor-pointer" onClick={() => up({ universities: p.universities.filter((x) => x !== id) })}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {filtered.map((u) => (
                  <Chip key={u.id} selected={p.universities.includes(u.id)} onClick={() => up({ universities: toggle(p.universities, u.id) })}>
                    <span className="font-medium">{u.short}</span>
                    <span className="block text-xs text-muted-foreground">{u.city}{u.abroad && " · за рубежом"}</span>
                  </Chip>
                ))}
              </div>
              <Chip selected={false} onClick={() => up({ universities: [] })}>Пока никакие</Chip>
            </div>
          );
        },
      },
      {
        id: "criteria",
        block: "E. Вузы",
        title: "Что важно в вузе? Выбери и расставь топ-5",
        hint: "Порядок выбора = приоритет (1 — самое важное). Стрелками можно поменять.",
        answered: (p) => p.uniCriteria.length > 0,
        render: () => (
          <div className="space-y-3">
            {p.uniCriteria.length > 0 && (
              <ol className="space-y-1.5">
                {p.uniCriteria.map((c, idx) => (
                  <li key={c} className="flex items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{idx + 1}</span>
                    <span className="flex-1">{UNI_CRITERIA.find((x) => x.id === c)?.label}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Выше" disabled={idx === 0}
                      onClick={() => { const a = [...p.uniCriteria]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; up({ uniCriteria: a }); }}><ChevronUp /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ниже" disabled={idx === p.uniCriteria.length - 1}
                      onClick={() => { const a = [...p.uniCriteria]; [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]]; up({ uniCriteria: a }); }}><ChevronDown /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Убрать" onClick={() => up({ uniCriteria: p.uniCriteria.filter((x) => x !== c) })}><X /></Button>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex flex-wrap gap-2">
              {UNI_CRITERIA.filter((c) => !p.uniCriteria.includes(c.id)).map((c) => (
                <Chip key={c.id} selected={false} disabled={p.uniCriteria.length >= 5} onClick={() => up({ uniCriteria: toggle(p.uniCriteria, c.id, 5) })}>{c.label}</Chip>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: "done",
        block: "Готово",
        title: "Готово! Проверим ответы",
        answered: () => true,
        render: () => null,
      },
    ];
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, regionQuery, uniQuery, regions, universities, subjects]);

  const total = steps.length;
  const idx = Math.min(i, total - 1);
  const step = steps[idx];
  const answeredCount = steps.slice(1, -1).filter((s) => s.answered(p)).length;
  const completeness = Math.round((answeredCount / (total - 2)) * 100);

  if (!ready) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pt-8">
        <div className="h-2 w-full animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const go = (d: number) => {
    if (d > 0) {
      const next = steps[Math.min(total - 1, idx + 1)];
      if (step.id === "consent") track("quiz_start");
      const letter = step.block.match(/^([A-E])\./)?.[1];
      if (letter && next.block !== step.block) track("quiz_block_done", { block: letter });
    }
    setI((x) => Math.max(0, Math.min(total - 1, x + d)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const finish = () => {
    track("quiz_complete", { completeness });
    removeLS(KEYS.mode);
    router.push("/results");
  };
  const reset = () => {
    if (!confirm("Сбросить все ответы?")) return;
    setP(emptyProfile());
    setI(0);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-6" data-testid="quiz">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span data-testid="quiz-block">{step.block}</span>
          <span className="tabular-nums" data-testid="quiz-step">Шаг {idx + 1} из {total}</span>
        </div>
        <Progress value={((idx + 1) / total) * 100} label="Прогресс анкеты" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div>
            <h1 className="text-xl font-semibold leading-snug sm:text-2xl" data-testid="quiz-title">{step.title}</h1>
            {step.hint && <p className="mt-1 text-sm text-muted-foreground">{step.hint}</p>}
          </div>
          {step.id === "done" ? (
            <Summary p={p} steps={steps} completeness={completeness} onJump={(n) => setI(n)} />
          ) : (
            step.render()
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => go(-1)} disabled={idx === 0} aria-label="Назад">
          <ArrowLeft /> Назад
        </Button>
        {step.id === "done" ? (
          <Button className="ml-auto" size="lg" onClick={finish} data-testid="quiz-finish">
            <Sparkles /> <span className="sm:hidden">Результаты</span><span className="hidden sm:inline">Посмотреть результаты</span>
          </Button>
        ) : (
          <>
            {step.id !== "consent" && !step.answered(p) && (
              <Button variant="ghost" className="ml-auto" onClick={() => go(1)}>Пропустить</Button>
            )}
            <Button
              className={cn(step.id === "consent" || step.answered(p) ? "ml-auto" : "")}
              onClick={() => go(1)}
              disabled={step.id === "consent" && !p.consent}
              data-testid="quiz-next"
            >
              Далее <ArrowRight />
            </Button>
          </>
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Ответы сохраняются автоматически в этом браузере.</span>
        <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"><RotateCcw className="h-3 w-3" /> Сбросить</button>
      </div>
    </div>
  );
}

function Summary({ p, steps, completeness, onJump }: { p: StudentProfile; steps: Step[]; completeness: number; onJump: (n: number) => void }) {
  const missed = steps.map((s, n) => ({ s, n })).filter(({ s }) => s.id !== "consent" && s.id !== "done" && !s.answered(p));
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>Полнота анкеты</span>
          <b data-testid="completeness">{completeness}%</b>
        </div>
        <Progress value={completeness} label="Полнота анкеты" />
        <p className="mt-2 text-xs text-muted-foreground">
          {completeness >= 85 ? QUIZ.done.good : QUIZ.done.weak}
        </p>
      </div>
      {missed.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Можно вернуться и ответить:</p>
          <div className="flex flex-wrap gap-2">
            {missed.map(({ s, n }) => (
              <Button key={s.id} size="sm" variant="outline" onClick={() => onJump(n)}>{s.title}</Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
