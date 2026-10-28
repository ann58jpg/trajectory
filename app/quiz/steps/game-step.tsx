"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { CARD_BY_ID, GAME_ROUNDS, gameSummary, nextRoundCards } from "@/lib/engine/game";
import { GAME_SUMMARY, QUIZ } from "@/lib/copy";
import type { GameRound } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** Игра «Что бы ты делал(а) завтра на работе?»: выбираешь задачу, потом видишь, чья это работа. */
export function GameStep({ rounds, onChange }: { rounds: GameRound[]; onChange: (r: GameRound[]) => void }) {
  const done = rounds.filter((r) => r.pick);
  // последний сыгранный раунд показываем с открытыми профессиями, пока не нажмут «Следующий раунд»
  const [revealed, setRevealed] = useState<number | null>(null);
  const showing = revealed !== null && done[revealed] ? done[revealed] : null;
  const finished = done.length >= GAME_ROUNDS && !showing;

  if (finished) {
    const s = gameSummary(done);
    return (
      <div className="space-y-3 rounded-lg border p-4" data-testid="game-summary">
        <p className="font-medium">{QUIZ.game.summaryTitle}</p>
        {s.spheres.length === 0 && s.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{GAME_SUMMARY.none}</p>
        ) : (
          <>
            {s.spheres.length > 0 && <p className="text-sm">{GAME_SUMMARY.spheres} <b>{s.spheres.join(", ")}</b></p>}
            {s.tasks.length > 0 && (
              <div className="text-sm">
                <p>{GAME_SUMMARY.tasks}</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                  {s.tasks.map((t) => <li key={t.text}>{t.text} <span className="text-foreground">— {t.profession}</span></li>)}
                </ul>
              </div>
            )}
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => { setRevealed(null); onChange([]); }}><RotateCcw /> {QUIZ.game.restart}</Button>
      </div>
    );
  }

  const roundNo = showing ? (revealed ?? 0) + 1 : done.length + 1;
  const cards = showing ? showing.cards : nextRoundCards(done);
  const answer = (pick: string) => {
    onChange([...done, { cards, pick }]);
    setRevealed(done.length);
  };

  return (
    <div className="space-y-3" data-testid="game">
      <div className="space-y-1">
        <p className="text-sm font-medium tabular-nums" data-testid="game-round">{QUIZ.game.round(roundNo, GAME_ROUNDS)}</p>
        <Progress value={(done.length / GAME_ROUNDS) * 100} label={QUIZ.game.round(roundNo, GAME_ROUNDS)} />
      </div>
      <div className={cn("grid gap-2", cards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {cards.map((id) => {
          const c = CARD_BY_ID.get(id)!;
          const picked = showing && (showing.pick === id || showing.pick === "all");
          return (
            <button
              key={id}
              type="button"
              disabled={Boolean(showing)}
              onClick={() => answer(id)}
              data-testid="game-card"
              className={cn(
                "flex min-h-28 cursor-pointer flex-col justify-between gap-2 rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-muted disabled:cursor-default",
                picked && "border-primary bg-primary/5 hover:bg-primary/5",
                showing && !picked && "opacity-70 hover:bg-card",
              )}
            >
              <span>{c.text}</span>
              {showing && (
                <span className="text-xs font-medium text-primary" data-testid="game-reveal">
                  {picked && <Check className="mr-1 inline h-3 w-3" aria-label={QUIZ.game.yourPick} />}
                  {QUIZ.game.reveal(c.professionName)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {showing ? (
        <Button onClick={() => setRevealed(null)} data-testid="game-next">
          {done.length >= GAME_ROUNDS ? QUIZ.game.finish : QUIZ.game.nextRound}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => answer("all")} data-testid="game-all">{cards.length === 2 ? QUIZ.game.both : QUIZ.game.all}</Button>
          <Button variant="ghost" size="sm" onClick={() => answer("none")} data-testid="game-none">{QUIZ.game.none}</Button>
        </div>
      )}
    </div>
  );
}
