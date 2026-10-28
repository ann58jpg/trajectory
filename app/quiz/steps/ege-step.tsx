"use client";
import { AlertTriangle, Lock } from "lucide-react";
import { Chip } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { DVI_TEXT, FOREIGN_LANG, QUIZ } from "@/lib/copy";
import type { StudentProfile } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Up = (patch: Partial<StudentProfile>) => void;
type Subject = { id: string; name: string };

/** Порядок предметов в анкете (официальный список ЕГЭ). */
export const EGE_ORDER = ["rus", "math", "math_base", "soc", "inf", "foreign", "bio", "chem", "phys", "geo", "lit", "hist"];

export function withRus(ege: StudentProfile["ege"]): StudentProfile["ege"] {
  return ege.some((e) => e.subject === "rus") ? ege : [{ subject: "rus", score: null }, ...ege];
}

export function EgeStep({ p, up, subjects }: { p: StudentProfile; up: Up; subjects: Subject[] }) {
  const ege = withRus(p.ege);
  const has = (id: string) => ege.some((e) => e.subject === id);
  const name = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const toggle = (id: string) => {
    if (id === "rus") return;
    let next = has(id) ? ege.filter((e) => e.subject !== id) : [...ege, { subject: id, score: null }];
    // профильная и базовая математика — одна или другая
    if (!has(id) && id === "math") next = next.filter((e) => e.subject !== "math_base");
    if (!has(id) && id === "math_base") next = next.filter((e) => e.subject !== "math");
    up({ ege: next });
  };
  const setScore = (id: string, score: number | null) => up({ ege: ege.map((x) => (x.subject === id ? { ...x, score } : x)) });
  const rus = ege.find((e) => e.subject === "rus")!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EGE_ORDER.filter((id) => subjects.some((s) => s.id === id)).map((id) =>
          id === "rus" ? (
            <Chip key={id} selected disabled className="flex items-center gap-1.5 disabled:opacity-100" onClick={() => {}}>
              <Lock className="h-3.5 w-3.5" aria-hidden /> {name(id)}
              <span className="sr-only">{QUIZ.ege.rusLocked}</span>
            </Chip>
          ) : (
            <Chip key={id} selected={has(id)} onClick={() => toggle(id)}>
              {name(id)}
            </Chip>
          ),
        )}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> {QUIZ.ege.rusLocked}</p>

      {has("math_base") && (
        <p className="flex items-start gap-2 rounded-lg border border-warn/50 bg-warn/10 p-3 text-sm" role="note" data-testid="math-base-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" /> {QUIZ.ege.mathBaseWarn}
        </p>
      )}

      {has("foreign") && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{QUIZ.ege.language}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={QUIZ.ege.language}>
            {(Object.entries(FOREIGN_LANG) as [StudentProfile["foreignLang"], string][]).map(([v, l]) => (
              <Chip key={v} role="radio" selected={p.foreignLang === v} onClick={() => up({ foreignLang: v })}>{l}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {ege.map((e) => (
          <ScoreRow
            key={e.subject}
            label={e.subject === "foreign" ? `${name("foreign")} (${FOREIGN_LANG[p.foreignLang]})` : name(e.subject)}
            score={e.score}
            onChange={(v) => setScore(e.subject, v)}
            required={e.subject === "rus"}
            base={e.subject === "math_base"}
          />
        ))}
        {rus.score === null && <p className="text-xs text-bad" data-testid="rus-score-needed">{QUIZ.ege.rusScoreNeeded}</p>}
      </div>
    </div>
  );
}

function ScoreRow({ label, score, onChange, required, base }: { label: string; score: number | null; onChange: (v: number | null) => void; required?: boolean; base?: boolean }) {
  // у базовой математики отметка 2–5, а не 0–100
  const max = base ? 5 : 100;
  const min = base ? 2 : 0;
  return (
    <div className={cn("rounded-lg border p-3", required && score === null && "border-bad/50")} data-testid="ege-row">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-2">
          <b className="tabular-nums">{score ?? QUIZ.ege.unknown}</b>
          <button type="button" className="cursor-pointer text-xs text-muted-foreground underline" onClick={() => onChange(score === null ? (base ? 4 : 70) : null)}>
            {score === null ? QUIZ.ege.setScore : QUIZ.ege.unknown}
          </button>
        </span>
      </div>
      {score !== null && <Slider value={[score]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} thumbLabel={QUIZ.ege.scoreLabel(label)} />}
    </div>
  );
}

export function DviStep({ p, up }: { p: StudentProfile; up: Up }) {
  const kinds = Object.keys(DVI_TEXT) as (keyof typeof DVI_TEXT)[];
  const toggle = (k: keyof typeof DVI_TEXT) => {
    const cur = p.dviReady.filter((x) => x !== "none");
    up({ dviReady: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
  };
  return (
    <div className="grid gap-2">
      {kinds.map((k) => (
        <Chip key={k} selected={p.dviReady.includes(k)} onClick={() => toggle(k)}>{DVI_TEXT[k].label}</Chip>
      ))}
      <Chip selected={p.dviReady.includes("none")} onClick={() => up({ dviReady: p.dviReady.includes("none") ? [] : ["none"] })}>{QUIZ.dvi.none}</Chip>
    </div>
  );
}
