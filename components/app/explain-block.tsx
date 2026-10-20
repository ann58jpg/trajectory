"use client";
import { useEffect, useState } from "react";
import { MessageCircleQuestion, Sparkles, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { useProfile } from "@/lib/client/storage";
import type { Explanation, StudentProfile } from "@/lib/schemas";

export function profileSummary(p: StudentProfile): string {
  const parts: string[] = [];
  if (p.city) parts.push(`город ${p.city}`);
  if (p.relocation) parts.push(`переезд: ${p.relocation}`);
  if (p.moneyHorizon) parts.push(`горизонт денег: ${p.moneyHorizon}`);
  if (p.finance) parts.push(`финансы: ${p.finance}`);
  if (p.ege.length) parts.push(`ЕГЭ: ${p.ege.map((e) => `${e.subject}${e.score ? " " + e.score : ""}`).join(", ")}`);
  const likes = Object.entries(p.subjectLikes).map(([s, r]) => `${s} (${r.join("/")})`);
  if (likes.length) parts.push(`предметы: ${likes.join(", ")}`);
  if (p.hobbies.length) parts.push(`хобби: ${p.hobbies.join(", ")}`);
  if (p.dream) parts.push(`мечта: «${p.dream.slice(0, 200)}»`);
  return parts.join("; ");
}

export function ExplainBlock({ entityType, entityId, variant = "profession" }: { entityType: "profession" | "university"; entityId: string; variant?: "profession" | "university" }) {
  const [profile, , ready] = useProfile();
  const [data, setData] = useState<(Explanation & { source: "ai" | "template" }) | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ready) return;
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId, profileSummary: profileSummary(profile), profile: profile.consent ? profile : undefined }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setData({ ...j.result, source: j.source }))
      .catch(() => setFailed(true));
  }, [ready, profile, entityType, entityId]);

  if (failed) return null;
  if (!data) return <Skeleton className="h-48" />;
  return (
    <Card data-testid="explain-block">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {variant === "university" ? "Почувствуй вайб: совет перед визитом" : "Почему это тебе"}
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">{data.source === "ai" ? "персонально от ИИ" : "шаблон демо-режима"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>{data.whyYou}</p>
        <div>
          <p className="mb-1 flex items-center gap-1.5 font-medium"><Sun className="h-4 w-4 text-warn" /> {variant === "university" ? "Как прочувствовать атмосферу" : "День из жизни"}</p>
          <p className="text-muted-foreground">{data.dayInLife}</p>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 font-medium"><MessageCircleQuestion className="h-4 w-4 text-accent" /> Что спросить у студентов 2–3 курса</p>
          <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">{data.askStudents.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
      </CardContent>
    </Card>
  );
}
