"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/misc";
import { useDemoVibe, useProfile } from "@/lib/storage";
import { MIN_ANSWERS, ORDINAL, hasVibe, radar, vibeMatch, type ApplicantVibe, type UniVibe } from "@/lib/vibe";
import { VIBE } from "@/lib/copy";
import { CHART } from "@/lib/chart-colors";
import { DataGap } from "./data-gap";

export type VibeResp = { vibe: UniVibe | null; count: number; realCount: number; similar?: { id: string; short: string; match: number; vibe: UniVibe }[] };

export const toApplicant = (v: { ordinal: Record<string, number>; leisure: string[]; spirit: string[] }): ApplicantVibe => v as ApplicantVibe;

/** Загрузить вайб вуза с учётом переключателя «Демо-вайб». */
export function useUniVibe(universityId: string, similar = false) {
  const [demo, , ready] = useDemoVibe();
  const [data, setData] = useState<VibeResp | null>(null);
  useEffect(() => {
    if (!ready) return;
    fetch(`/api/vibe?universityId=${encodeURIComponent(universityId)}${demo ? "&demo=1" : ""}${similar ? "&similar=1" : ""}`)
      .then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null));
  }, [universityId, demo, ready, similar]);
  return data;
}

/** «Паутинка»: твой вайб и вайб вуза поверх друг друга. */
export function VibeRadar({ you, uni }: { you: ApplicantVibe | null; uni: UniVibe | null }) {
  const data = radar(you, uni).map((r) => ({
    axis: r.axis in VIBE.scales ? VIBE.scales[r.axis as keyof typeof VIBE.scales].axis : VIBE.axis[r.axis as keyof typeof VIBE.axis],
    you: r.you === null ? 0 : Math.round(r.you * 100),
    uni: r.uni === null ? 0 : Math.round(r.uni * 100),
  }));
  return (
    <div className="h-72 w-full" data-testid="vibe-radar">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={CHART.grid} />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: CHART.axis }} />
          {uni && <Radar name={VIBE.uni} dataKey="uni" stroke={CHART.primary} fill={CHART.primary} fillOpacity={0.25} />}
          {you && <Radar name={VIBE.you} dataKey="you" stroke={CHART.accent} fill={CHART.accent} fillOpacity={0.2} />}
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Распределения ответов по шкалам, топ досуга и тегов. */
export function VibeDetails({ vibe }: { vibe: UniVibe }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {ORDINAL.map((s) => {
          const d = vibe.ordinal[s].dist;
          const total = d.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={s} data-testid="vibe-scale">
              <p className="font-medium">{VIBE.scales[s].label}</p>
              {VIBE.scales[s].options.map((o, i) => (
                <div key={o} className="mt-1 flex items-center gap-2 text-xs">
                  <div className="h-2 w-20 shrink-0 overflow-hidden rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(d[i] / total) * 100}%` }} /></div>
                  <span className="text-muted-foreground">{o} · {Math.round((d[i] / total) * 100)}%</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div>
        <p className="font-medium">{VIBE.leisureLabel}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{vibe.leisure.map((l) => <span key={l.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{VIBE.leisure[l.id]} · {Math.round(l.share * 100)}%</span>)}</div>
      </div>
      <div>
        <p className="font-medium">{VIBE.topTags}</p>
        <div className="mt-1 flex flex-wrap gap-1.5" data-testid="vibe-tags">{vibe.tags.map((t) => <span key={t.tag} className="rounded-full border px-2 py-0.5 text-xs">{t.tag}</span>)}</div>
      </div>
    </div>
  );
}

/** Блок «Вайб» на странице вуза: до 10 ответов — DataGap с приглашением, потом — паутинка и подробности. */
export function VibeBlock({ universityId }: { universityId: string }) {
  const data = useUniVibe(universityId);
  const [profile] = useProfile();
  const you = hasVibe(toApplicant(profile.vibe)) ? toApplicant(profile.vibe) : null;
  if (!data) return <Skeleton className="h-40" />;
  if (!data.vibe) {
    return (
      <div className="space-y-2" data-testid="vibe-gap">
        <DataGap what={VIBE.gapWhat(Math.min(data.count, MIN_ANSWERS - 1))} where={VIBE.gapWhere} />
        <Link href={`/vibe?u=${universityId}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{VIBE.gapCta}</Link>
      </div>
    );
  }
  const match = you ? Math.round(vibeMatch(you, data.vibe) * 100) : null;
  return (
    <div className="space-y-3" data-testid="vibe-block">
      {data.vibe.demo && (
        <p className="flex items-center gap-1.5 rounded-lg border border-warn/50 bg-warn/15 p-2 text-sm font-medium" data-testid="vibe-demo"><AlertTriangle className="h-4 w-4" /> {VIBE.demo}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {match !== null ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary" data-testid="vibe-match"><Sparkles className="h-4 w-4" /> {VIBE.match(match)}</span>
          : <span className="text-muted-foreground">{VIBE.noApplicant}</span>}
        <span className="text-xs text-muted-foreground">{VIBE.answers(data.vibe.count)}</span>
      </div>
      <VibeRadar you={you} uni={data.vibe} />
      <VibeDetails vibe={data.vibe} />
    </div>
  );
}
