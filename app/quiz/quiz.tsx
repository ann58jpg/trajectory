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
  block: string;
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
        block: QUIZ.blocks.start,
        title: QUIZ.consent.title,
        answered: (p) => p.consent,
        render: () => (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
              <p className="mb-2 flex items-center gap-2 font-medium"><Lock className="h-4 w-4 text-primary" /> {QUIZ.consent.privacyTitle}</p>
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
              <p className="flex items-center gap-2 text-sm font-medium"><Wand2 className="h-4 w-4 text-primary" /> {QUIZ.consent.tryPersona}</p>
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
        block: QUIZ.blocks.A,
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
        block: QUIZ.blocks.A,
        title: QUIZ.guides.title,
        hint: QUIZ.guides.hint,
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
            <Input placeholder={QUIZ.guides.other} value={p.guideOther} maxLength={200} onChange={(e) => up({ guideOther: e.target.value })} aria-label={QUIZ.guides.other} />
          </div>
        ),
      },
      {
        id: "horizon",
        block: QUIZ.blocks.A,
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
        block: QUIZ.blocks.B,
        title: QUIZ.region.title,
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
                <Input className="pl-9" placeholder={QUIZ.region.search} value={regionQuery} onChange={(e) => setRegionQuery(e.target.value)} aria-label={QUIZ.region.searchLabel} />
              </div>
              <div className="grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2" role="radiogroup" aria-label={QUIZ.region.label}>
                {filtered.map((r) => (
                  <Chip key={r.id} role="radio" selected={p.regionId === r.id} onClick={() => up({ regionId: r.id, city: r.cities[0] })}>{r.name}</Chip>
                ))}
                {!filtered.length && <p className="text-sm text-muted-foreground">{QUIZ.region.notFound}</p>}
              </div>
              {region && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{QUIZ.region.city}</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={QUIZ.region.city}>
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
        block: QUIZ.blocks.B,
        title: QUIZ.relocation.title,
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
        block: QUIZ.blocks.B,
        title: QUIZ.dorm.title,
        answered: (p) => p.dorm !== null,
        render: () => (
          <div className="flex flex-wrap gap-2">
            {(Object.entries(QUIZ.dorm.options) as [keyof typeof QUIZ.dorm.options, string][]).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.dorm === v} onClick={() => up({ dorm: v })}>{l}</Chip>
            ))}
          </div>
        ),
      },
      {
        id: "finance",
        block: QUIZ.blocks.B,
        title: QUIZ.finance.title,
        answered: (p) => p.finance !== null,
        render: () => (
          <div className="space-y-4">
            <div className="grid gap-2">
              {([
                ["budget", QUIZ.finance.options.budget],
                ["budget_or_paid", QUIZ.finance.options.budget_or_paid],
                ["paid", QUIZ.finance.options.paid],
                ["credit", QUIZ.finance.options.credit],
              ] as const).map(([v, l]) => (
                <Chip key={v} role="radio" selected={p.finance === v} onClick={() => up({ finance: v })}>{l}</Chip>
              ))}
            </div>
            {p.finance === "budget_or_paid" && (
              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-sm">{QUIZ.finance.limit(`${p.paidLimit.toLocaleString("ru-RU")} ₽`)}</p>
                <Slider value={[p.paidLimit]} min={50000} max={1000000} step={10000} onValueChange={([v]) => up({ paidLimit: v })} thumbLabel={QUIZ.finance.limitLabel} />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">{QUIZ.finance.benefits}</p>
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
        block: QUIZ.blocks.B,
        title: QUIZ.gender.title,
        hint: QUIZ.gender.hint,
        answered: (p) => p.gender !== null,
        render: () => (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(QUIZ.gender.options) as [keyof typeof QUIZ.gender.options, string][]).map(([v, l]) => (
                <Chip key={v} role="radio" selected={p.gender === v} onClick={() => up({ gender: v, vucImportant: v === "m" ? p.vucImportant : null })}>{l}</Chip>
              ))}
            </div>
            {p.gender === "m" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{QUIZ.gender.vuc}</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(QUIZ.gender.vucOptions) as [keyof typeof QUIZ.gender.vucOptions, string][]).map(([v, l]) => (
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
        block: QUIZ.blocks.C,
        title: QUIZ.egeOrder.title,
        answered: (p) => p.egeOrder !== null,
        render: () => (
          <div className="grid gap-2">
            {([
              ["chosen", QUIZ.egeOrder.options.chosen],
              ["by_goal", QUIZ.egeOrder.options.by_goal],
              ["undecided", QUIZ.egeOrder.options.undecided],
            ] as const).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.egeOrder === v} onClick={() => up({ egeOrder: v })}>{l}</Chip>
            ))}
            {p.egeOrder && p.egeOrder !== "chosen" && (
              <p className="rounded-lg bg-primary/8 p-3 text-sm">
                {QUIZ.egeOrder.goalHint}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "ege",
        block: QUIZ.blocks.C,
        title: QUIZ.ege.title,
        hint: QUIZ.ege.hint,
        answered: (p) => p.ege.some((e) => e.subject !== "rus") && p.ege.some((e) => e.subject === "rus" && e.score !== null),
        render: () => <EgeStep p={p} up={up} subjects={subjects} />,
      },
      {
        id: "dvi",
        block: QUIZ.blocks.C,
        title: QUIZ.dvi.title,
        hint: QUIZ.dvi.hint,
        answered: (p) => p.dviReady.length > 0,
        render: () => <DviStep p={p} up={up} />,
      },
      {
        id: "grade",
        block: QUIZ.blocks.C,
        title: QUIZ.grade.title,
        answered: (p) => p.grade !== null,
        render: () => (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(QUIZ.grade.options) as [keyof typeof QUIZ.grade.options, string][]).map(([v, l]) => (
                <Chip key={v} role="radio" selected={p.grade === v} onClick={() => up({ grade: v })}>{l}</Chip>
              ))}
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span>{QUIZ.grade.gpa}</span>
                <b className="tabular-nums">{p.gpa?.toFixed(1) ?? QUIZ.grade.gpaUnknown}</b>
              </div>
              <Slider value={[p.gpa ?? 4]} min={3} max={5} step={0.1} onValueChange={([v]) => up({ gpa: Math.round(v * 10) / 10 })} thumbLabel={QUIZ.grade.gpa} />
              <p className="text-xs text-muted-foreground">{QUIZ.grade.gpaHint}</p>
            </div>
          </div>
        ),
      },
      {
        id: "likes",
        block: QUIZ.blocks.C,
        title: QUIZ.likes.title,
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
                  <summary className="cursor-pointer">{QUIZ.likes.addOther}</summary>
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
        block: QUIZ.blocks.C,
        title: QUIZ.achievements.title,
        answered: (p) => p.olympiad !== "none" || p.achievements.length > 0 || p.achievementsOther.trim().length > 0,
        render: () => (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{QUIZ.achievements.olympiad}</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(QUIZ.achievements.olympiadOptions) as [keyof typeof QUIZ.achievements.olympiadOptions, string][]).map(([v, l]) => (
                  <Chip key={v} role="radio" selected={p.olympiad === v} onClick={() => up({ olympiad: v })}>{l}</Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENTS.map((a) => (
                <Chip key={a.id} selected={p.achievements.includes(a.id)} onClick={() => up({ achievements: toggle(p.achievements, a.id) })}>{a.label}</Chip>
              ))}
            </div>
            <Input placeholder={QUIZ.achievements.other} value={p.achievementsOther} maxLength={300} onChange={(e) => up({ achievementsOther: e.target.value })} aria-label={QUIZ.achievements.other} />
          </div>
        ),
      },
      {
        id: "hobbies",
        block: QUIZ.blocks.D,
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
        block: QUIZ.blocks.D,
        title: QUIZ.game.title,
        hint: QUIZ.game.hint,
        answered: (p) => p.game.filter((r) => r.pick).length >= GAME_ROUNDS,
        render: () => <GameStep rounds={p.game} onChange={(game) => up({ game })} />,
      },
      {
        id: "formats",
        block: QUIZ.blocks.D,
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
        block: QUIZ.blocks.D,
        title: QUIZ.dream.title,
        hint: QUIZ.dream.hint,
        answered: (p) => p.dream.trim().length >= 10,
        render: () => (
          <div className="space-y-2">
            <Textarea value={p.dream} maxLength={2000} placeholder={QUIZ.dream.placeholder} onChange={(e) => up({ dream: e.target.value })} aria-label={QUIZ.dream.label} />
            <p className="text-right text-xs text-muted-foreground">{p.dream.length}/2000</p>
          </div>
        ),
      },
      {
        id: "unis",
        block: QUIZ.blocks.E,
        title: QUIZ.unis.title,
        hint: QUIZ.unis.hint,
        answered: (p) => p.universities.length > 0,
        render: () => {
          const q = uniQuery.trim().toLowerCase();
          const filtered = universities.filter((u) => !q || [u.short, u.name, u.city, ...u.aliases].some((x) => x.toLowerCase().includes(q)));
          return (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder={QUIZ.unis.search} value={uniQuery} onChange={(e) => setUniQuery(e.target.value)} aria-label={QUIZ.unis.searchLabel} />
              </div>
              {p.universities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.universities.map((id) => (
                    <Badge key={id} variant="default" className="gap-1 py-1">
                      {universities.find((u) => u.id === id)?.short}
                      <button type="button" aria-label={QUIZ.unis.remove} className="cursor-pointer" onClick={() => up({ universities: p.universities.filter((x) => x !== id) })}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {filtered.map((u) => (
                  <Chip key={u.id} selected={p.universities.includes(u.id)} onClick={() => up({ universities: toggle(p.universities, u.id) })}>
                    <span className="font-medium">{u.short}</span>
                    <span className="block text-xs text-muted-foreground">{u.city}{u.abroad && ` · ${QUIZ.unis.abroad}`}</span>
                  </Chip>
                ))}
              </div>
              <Chip selected={false} onClick={() => up({ universities: [] })}>{QUIZ.unis.none}</Chip>
            </div>
          );
        },
      },
      {
        id: "criteria",
        block: QUIZ.blocks.E,
        title: QUIZ.criteria.title,
        hint: QUIZ.criteria.hint,
        answered: (p) => p.uniCriteria.length > 0,
        render: () => (
          <div className="space-y-3">
            {p.uniCriteria.length > 0 && (
              <ol className="space-y-1.5">
                {p.uniCriteria.map((c, idx) => (
                  <li key={c} className="flex items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{idx + 1}</span>
                    <span className="flex-1">{UNI_CRITERIA.find((x) => x.id === c)?.label}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={QUIZ.criteria.up} disabled={idx === 0}
                      onClick={() => { const a = [...p.uniCriteria]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; up({ uniCriteria: a }); }}><ChevronUp /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={QUIZ.criteria.down} disabled={idx === p.uniCriteria.length - 1}
                      onClick={() => { const a = [...p.uniCriteria]; [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]]; up({ uniCriteria: a }); }}><ChevronDown /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={QUIZ.criteria.remove} onClick={() => up({ uniCriteria: p.uniCriteria.filter((x) => x !== c) })}><X /></Button>
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
        block: QUIZ.blocks.done,
        title: QUIZ.done.title,
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
    if (!confirm(QUIZ.resetConfirm)) return;
    setP(emptyProfile());
    setI(0);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-6" data-testid="quiz">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span data-testid="quiz-block">{step.block}</span>
          <span className="tabular-nums" data-testid="quiz-step">{QUIZ.stepOf(idx + 1, total)}</span>
        </div>
        <Progress value={((idx + 1) / total) * 100} label={QUIZ.progressLabel} />
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
        <Button variant="outline" onClick={() => go(-1)} disabled={idx === 0} aria-label={QUIZ.back}>
          <ArrowLeft /> {QUIZ.back}
        </Button>
        {step.id === "done" ? (
          <Button className="ml-auto" size="lg" onClick={finish} data-testid="quiz-finish">
            <Sparkles /> <span className="sm:hidden">{QUIZ.finishShort}</span><span className="hidden sm:inline">{QUIZ.finishLong}</span>
          </Button>
        ) : (
          <>
            {step.id !== "consent" && !step.answered(p) && (
              <Button variant="ghost" className="ml-auto" onClick={() => go(1)}>{QUIZ.skip}</Button>
            )}
            <Button
              className={cn(step.id === "consent" || step.answered(p) ? "ml-auto" : "")}
              onClick={() => go(1)}
              disabled={step.id === "consent" && !p.consent}
              data-testid="quiz-next"
            >
              {QUIZ.next} <ArrowRight />
            </Button>
          </>
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{QUIZ.autosave}</span>
        <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"><RotateCcw className="h-3 w-3" /> {QUIZ.reset}</button>
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
          <span>{QUIZ.done.fullness}</span>
          <b data-testid="completeness">{completeness}%</b>
        </div>
        <Progress value={completeness} label={QUIZ.done.fullness} />
        <p className="mt-2 text-xs text-muted-foreground">
          {completeness >= 85 ? QUIZ.done.good : QUIZ.done.weak}
        </p>
      </div>
      {missed.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{QUIZ.done.backTo}</p>
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
