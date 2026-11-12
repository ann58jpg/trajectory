"use client";
import { useMarkChapter } from "@/components/app/use-route";
import { TestFirstHint } from "@/components/app/test-first-hint";
import { useProfile } from "@/lib/storage";
import { LIFE } from "@/lib/copy";

export function ChapterView() {
  useMarkChapter(4);
  const [p] = useProfile();
  return (
    <div className="space-y-4" data-testid="chapter-life">
      {!p.consent && <TestFirstHint />}
      <h1 className="text-2xl font-bold sm:text-3xl">{LIFE.title}</h1>
      <p className="text-muted-foreground">{LIFE.lead}</p>
    </div>
  );
}
