"use client";
import { Chip } from "@/components/ui/misc";
import { LEISURE, ORDINAL, SPIRIT } from "@/lib/vibe";
import { VIBE, VIBE_APPLICANT } from "@/lib/copy";
import type { StudentProfile } from "@/lib/schemas";

type V = StudentProfile["vibe"];

/** «Какой вайб тебе нужен?»: 6 шкал по 3 варианта + досуг + дух вуза. */
export function VibeStep({ value, onChange }: { value: V; onChange: (v: V) => void }) {
  const toggle = (arr: string[], x: string, max?: number) => (arr.includes(x) ? arr.filter((y) => y !== x) : max && arr.length >= max ? arr : [...arr, x]);
  return (
    <div className="space-y-5" data-testid="vibe-step">
      {ORDINAL.map((s) => (
        <fieldset key={s} className="space-y-2">
          <legend className="text-sm font-medium">{VIBE_APPLICANT.questions[s].q}</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {VIBE_APPLICANT.questions[s].options.map((o, i) => (
              <Chip key={o} role="radio" selected={value.ordinal[s] === i} onClick={() => onChange({ ...value, ordinal: { ...value.ordinal, [s]: i } })}>{o}</Chip>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{VIBE_APPLICANT.questions.leisure.q}</legend>
        <div className="flex flex-wrap gap-2">
          {LEISURE.filter((l) => l !== "nothing").map((l) => (
            <Chip key={l} selected={value.leisure.includes(l)} onClick={() => onChange({ ...value, leisure: toggle(value.leisure, l) })}>{VIBE.leisure[l]}</Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{VIBE_APPLICANT.questions.spirit.q}</legend>
        <div className="flex flex-wrap gap-2">
          {SPIRIT.map((x) => (
            <Chip key={x} selected={value.spirit.includes(x)} onClick={() => onChange({ ...value, spirit: toggle(value.spirit, x, 2) })}>{VIBE.spirit[x]}</Chip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
