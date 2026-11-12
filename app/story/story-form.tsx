"use client";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/misc";
import { UniPicker, type UniLite } from "@/components/app/uni-picker";
import { STORY } from "@/lib/copy";
import { SALARIES } from "@/lib/stories";
import { track } from "@/lib/analytics";

const field = "h-10 w-full rounded-lg border bg-background px-3";

export function StoryForm({ universities, initial }: { universities: UniLite[]; initial: UniLite | null }) {
  const [uni, setUni] = useState<UniLite | null>(initial);
  const [f, setF] = useState({ specialty: "", gradYear: "", age: "", sphere: "", position: "", salary: "none" as (typeof SALARIES)[number], city: "", advice: "", name: "", anonymous: false, consent: false });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const ready = uni !== null && f.specialty.trim().length > 1 && f.position.trim().length > 1 && f.city.trim().length > 1 && /^\d{4}$/.test(f.gradYear) && f.consent;

  const send = async () => {
    if (!ready || !uni) return;
    setState("sending");
    const res = await fetch("/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, universityId: uni.id, gradYear: Number(f.gradYear), age: f.age ? Number(f.age) : null, consent: true }),
    }).catch(() => null);
    if (res?.ok) {
      track("story_submit", { universityId: uni.id });
      setState("sent");
    } else setState("error");
  };

  if (state === "sent")
    return (
      <Card className="mt-4" data-testid="story-sent"><CardContent className="flex items-center gap-2 p-6 font-medium"><CheckCircle2 className="h-5 w-5 text-ok" /> {STORY.sent}</CardContent></Card>
    );

  const input = (k: "specialty" | "sphere" | "position" | "city" | "name", label: string, hint?: string) => (
    <label className="block space-y-1">
      <span className="font-medium">{label}</span>
      <input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={hint} maxLength={120} className={field} data-testid={`story-${k}`} />
    </label>
  );

  return (
    <div className="space-y-4 pt-4" data-testid="story-form">
      <h1 className="text-2xl font-bold sm:text-3xl">{STORY.title}</h1>
      <p className="text-muted-foreground">{STORY.lead}</p>
      <Card>
        <CardContent className="space-y-4 p-4 text-sm sm:p-6">
          <div className="space-y-1">
            <p className="font-medium">{STORY.uni}</p>
            <UniPicker universities={universities} value={uni} onChange={setUni} placeholder={STORY.uniSearch} label={STORY.uni} testid="story-uni" />
          </div>
          {input("specialty", STORY.specialty, STORY.specialtyHint)}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="font-medium">{STORY.gradYear}</span>
              <input inputMode="numeric" value={f.gradYear} onChange={(e) => set("gradYear", e.target.value.replace(/\D/g, "").slice(0, 4))} className={field} data-testid="story-gradYear" />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">{STORY.age}</span>
              <input inputMode="numeric" value={f.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 2))} className={field} data-testid="story-age" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("sphere", STORY.sphere, STORY.sphereHint)}
            {input("position", STORY.position, STORY.positionHint)}
          </div>
          <div className="space-y-1">
            <p className="font-medium">{STORY.salary}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={STORY.salary}>
              {SALARIES.map((s) => <Chip key={s} role="radio" selected={f.salary === s} onClick={() => set("salary", s)}>{STORY.salaries[s]}</Chip>)}
            </div>
          </div>
          {input("city", STORY.city)}
          <label className="block space-y-1">
            <span className="font-medium">{STORY.advice}</span>
            <textarea value={f.advice} onChange={(e) => set("advice", e.target.value)} placeholder={STORY.adviceHint} maxLength={600} rows={3} className="w-full rounded-lg border bg-background p-3" data-testid="story-advice" />
          </label>
          {input("name", STORY.name)}
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.anonymous} onChange={(e) => set("anonymous", e.target.checked)} className="h-4 w-4" /> {STORY.anonymous}</label>
          <label className="flex items-start gap-2 font-medium"><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4" data-testid="story-consent" /> {STORY.consent}</label>
          {state === "error" && <p className="text-sm text-red-600">{STORY.error}</p>}
          <Button size="lg" disabled={!ready || state === "sending"} onClick={send} data-testid="story-send"><Send /> {STORY.send}</Button>
          {!uni && <p className="text-xs text-muted-foreground">{STORY.noUni}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
