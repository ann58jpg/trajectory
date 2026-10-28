"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/client/storage";
import type { ProgramMatch } from "@/lib/schemas";
import { ProgramRow } from "./program-row";
import { PROFILE_PROGRAMS } from "@/lib/copy";

/** Программы для профессии/специальности/вуза, отфильтрованные под профиль из браузера. */
export function ProfilePrograms({ professionId, specialtyCode, universityId, title = PROFILE_PROGRAMS.title }: { professionId?: string; specialtyCode?: string; universityId?: string; title?: string }) {
  const [profile, , ready] = useProfile();
  const [programs, setPrograms] = useState<ProgramMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, professionId, specialtyCode, universityId }) })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.hint ?? j.error);
        setPrograms(j.programs);
      })
      .catch((e) => setError(e.message ?? ""));
  }, [ready, profile, professionId, specialtyCode, universityId]);

  if (error) return <p className="text-sm text-bad" role="alert">{PROFILE_PROGRAMS.error(error)}</p>;
  if (!programs) return <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;

  const passing = programs.filter((p) => p.excluded.length === 0);
  const excluded = programs.filter((p) => p.excluded.length > 0);
  const hasProfile = profile.consent;
  return (
    <section className="space-y-3" data-testid="profile-programs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {!hasProfile && <Link href="/quiz" className="text-sm text-primary hover:underline">{PROFILE_PROGRAMS.noProfile}</Link>}
      </div>
      {passing.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{PROFILE_PROGRAMS.empty}{excluded.length > 0 && PROFILE_PROGRAMS.emptyExcluded}</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {passing.slice(0, 12).map((pm) => <ProgramRow key={pm.programId} pm={pm} />)}
      </div>
      {excluded.length > 0 && (
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => setShowExcluded((x) => !x)} aria-expanded={showExcluded}>
            <Filter /> {showExcluded ? PROFILE_PROGRAMS.hideExcluded(excluded.length) : PROFILE_PROGRAMS.showExcluded(excluded.length)}
          </Button>
          {showExcluded && <div className="grid gap-2 md:grid-cols-2">{excluded.slice(0, 20).map((pm) => <ProgramRow key={pm.programId} pm={pm} showExcluded />)}</div>}
        </div>
      )}
    </section>
  );
}
