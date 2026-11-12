"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GraduationCap, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/storage";
import type { ProgramMatch } from "@/lib/schemas";
import { hasVibe, vibeMatch } from "@/lib/vibe";
import { UNI_PAGE } from "@/lib/copy";
import { toApplicant, useUniVibe } from "./vibe-block";

/** Шапка вуза: совпадение по специальностям (лучшая программа под профиль) и по вайбу. */
export function UniMatch({ universityId }: { universityId: string }) {
  const [profile, , ready] = useProfile();
  const [spec, setSpec] = useState<number | null>(null);
  const vibe = useUniVibe(universityId);
  useEffect(() => {
    if (!ready || !profile.consent) return;
    fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, universityId }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { programs: ProgramMatch[] } | null) => {
        const ok = j?.programs.filter((p) => p.excluded.length === 0) ?? [];
        setSpec(ok.length ? Math.round(Math.max(...ok.map((p) => p.score)) * 100) : 0);
      })
      .catch(() => setSpec(null));
  }, [ready, profile, universityId]);
  if (!ready) return null;
  if (!profile.consent) return <Link href="/quiz" className="text-sm text-primary hover:underline" data-testid="uni-match-hint">{UNI_PAGE.matchHint}</Link>;
  const you = hasVibe(toApplicant(profile.vibe)) ? toApplicant(profile.vibe) : null;
  const vm = you && vibe?.vibe ? Math.round(vibeMatch(you, vibe.vibe) * 100) : null;
  return (
    <div className="flex flex-wrap gap-2 text-sm" data-testid="uni-match">
      {spec !== null && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary" data-testid="uni-match-spec"><GraduationCap className="h-4 w-4" /> {UNI_PAGE.matchSpec(spec)}</span>}
      {vm !== null && <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 font-semibold" data-testid="uni-match-vibe"><Sparkles className="h-4 w-4" /> {UNI_PAGE.matchVibe(vm)}</span>}
    </div>
  );
}
