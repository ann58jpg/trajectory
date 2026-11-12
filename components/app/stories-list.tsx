"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { storyLine, type Story } from "@/lib/stories";
import { CAREER, STORY } from "@/lib/copy";

/** Опубликованные истории выпускников (одного вуза или все). */
export function StoriesList({ universityId, uniNames, limit = 6 }: { universityId?: string; uniNames: Record<string, string>; limit?: number }) {
  const [list, setList] = useState<Story[] | null>(null);
  useEffect(() => {
    fetch(`/api/stories${universityId ? `?universityId=${encodeURIComponent(universityId)}` : ""}`)
      .then((r) => (r.ok ? r.json() : { stories: [] })).then((j) => setList(j.stories)).catch(() => setList([]));
  }, [universityId]);
  if (!list) return <Skeleton className="h-20" />;
  return (
    <div className="space-y-2" data-testid="stories">
      {list.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground" data-testid="stories-empty">{CAREER.noStories}</p> : (
        <ul className="space-y-2">
          {list.slice(0, limit).map((s) => (
            <li key={s.id} className="rounded-lg border p-3 text-sm" data-testid="story">
              <p className="flex gap-2 font-medium"><MessageSquareQuote className="h-4 w-4 shrink-0 text-primary" /> {storyLine(s, uniNames[s.universityId] ?? s.universityId)}</p>
              {s.advice && <p className="mt-1 text-muted-foreground">{STORY.advicePrefix} {s.advice}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{STORY.gradPrefix} {s.gradYear}{s.salary !== "none" && <> · {STORY.salaryPrefix} {STORY.salaries[s.salary]}</>}</p>
            </li>
          ))}
        </ul>
      )}
      <Link href={`/story${universityId ? `?u=${universityId}` : ""}`} className="inline-flex text-sm font-medium text-primary hover:underline" data-testid="story-cta">{CAREER.storyCta}</Link>
    </div>
  );
}
