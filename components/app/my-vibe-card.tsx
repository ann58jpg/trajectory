"use client";
import { useProfile } from "@/lib/storage";
import { gameSummary } from "@/lib/engine/game";
import { hasVibe, vibeType, type ApplicantVibe } from "@/lib/vibe";
import { VIBE_CARD } from "@/lib/copy";
import { VibeCard } from "./vibe-card";

/** Вайб-карточка абитуриента: тип и 3 подходящие сферы. fallback — сферы из подборки, если игра не пройдена. */
export function MyVibeCard({ fallback = [] }: { fallback?: string[] }) {
  const [p, , ready] = useProfile();
  if (!ready) return null;
  const v = p.vibe as ApplicantVibe;
  if (!hasVibe(v)) return <p className="text-sm text-muted-foreground" data-testid="vibe-card-none">{VIBE_CARD.noVibe}</p>;
  const spheres = [...gameSummary(p.game).spheres, ...fallback].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4" data-testid="my-vibe">
      <h2 className="font-semibold">{VIBE_CARD.title}</h2>
      <VibeCard kind="applicant" kicker={VIBE_CARD.myVibe} title={vibeType(v).title} listTitle={VIBE_CARD.spheres} items={spheres} fileName="my-vibe.png" />
    </section>
  );
}
