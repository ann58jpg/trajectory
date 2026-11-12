"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, ClipboardList, Rocket, Sparkles, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ONBOARDING } from "@/lib/copy";
import { KEYS, writeLS } from "@/lib/storage";

const PICTURES = [ClipboardList, Sparkles, Star, CalendarCheck, Rocket];

/** «Как пользоваться»: 5 экранов с картинкой, листаются кнопками. */
export function HowTo({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const n = ONBOARDING.screens.length;
  const s = ONBOARDING.screens[i];
  const Pic = PICTURES[i];
  const close = () => {
    writeLS(KEYS.onboarding, true);
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={ONBOARDING.title} data-testid="howto">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{ONBOARDING.title} · {ONBOARDING.step(i + 1, n)}</span>
          <button type="button" onClick={close} aria-label={ONBOARDING.close} className="cursor-pointer rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="my-6 grid place-items-center">
          <div className="grid h-28 w-28 place-items-center rounded-3xl bg-primary/10 text-primary"><Pic className="h-14 w-14" strokeWidth={1.5} /></div>
        </div>
        <h2 className="text-xl font-bold" data-testid="howto-title">{s.title}</h2>
        <p className="mt-2 text-muted-foreground">{s.text}</p>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {ONBOARDING.screens.map((_, k) => <span key={k} className={`h-1.5 w-6 rounded-full ${k === i ? "bg-primary" : "bg-muted"}`} />)}
        </div>
        <div className="mt-6 flex gap-2">
          {i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>{ONBOARDING.back}</Button>}
          <Button className="ml-auto" onClick={() => (i < n - 1 ? setI(i + 1) : close())} data-testid="howto-next">
            {i < n - 1 ? ONBOARDING.next : ONBOARDING.done}
          </Button>
        </div>
      </div>
    </div>
  );
}
