"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { RESULTS } from "@/lib/copy";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** «Тебе это помогло?» — оценка 1–5 в аналитику (без текста, чтобы не собирать личные данные). */
export function Feedback({ mode }: { mode: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const send = (n: number) => {
    if (rating !== null) return;
    setRating(n);
    track("feedback", { rating: n, mode });
  };
  return (
    <section className="rounded-lg border p-4 text-center" data-testid="feedback">
      <h2 className="font-semibold">{RESULTS.feedbackTitle}</h2>
      {rating === null ? (
        <div className="mt-2 inline-flex gap-1" role="radiogroup" aria-label={RESULTS.feedbackTitle} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={false} aria-label={RESULTS.starLabel(n)} onMouseEnter={() => setHover(n)} onClick={() => send(n)}
              className="cursor-pointer rounded p-1 hover:bg-muted" data-testid={`feedback-${n}`}>
              <Star className={cn("h-7 w-7", n <= hover ? "fill-accent text-accent" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground" data-testid="feedback-thanks">{RESULTS.feedbackThanks}</p>
      )}
    </section>
  );
}
