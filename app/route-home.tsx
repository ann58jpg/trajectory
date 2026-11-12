"use client";
import Link from "next/link";
import { ArrowRight, Briefcase, Check, Circle, ClipboardList, Compass, MessageSquareHeart, PartyPopper, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { chapters, nextStep } from "@/lib/route";
import { useRouteInput } from "@/components/app/use-route";
import { ROUTE } from "@/lib/copy";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const ICONS = [ClipboardList, Compass, Route, PartyPopper, Briefcase];

export function RouteHome() {
  const { ready, input } = useRouteInput();
  const ch = chapters(input);
  const next = nextStep(input);
  return (
    <div className="space-y-8" data-testid="route">
      <section className="hero-bg -mx-4 rounded-none px-4 py-8 md:mx-0 md:rounded-2xl md:px-8">
        <h1 className="max-w-3xl text-balance text-2xl font-bold leading-tight sm:text-4xl" data-testid="slogan">{ROUTE.slogan}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{ROUTE.lead}</p>
        {/* одна главная кнопка на экране */}
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm" data-testid="next-step">
          <p className="text-sm font-medium text-primary">{ROUTE.nextTitle}</p>
          <p className="mt-1 text-xl font-bold">{ready ? next.title : ROUTE.next.test.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ready ? next.text : ROUTE.next.test.text}</p>
          <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
            <Link href={ready ? next.href : "/quiz"} data-testid="start-quiz">{ready ? next.cta : ROUTE.next.test.cta} <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ch.map((c) => {
          const Icon = ICONS[c.n - 1];
          const info = ROUTE.chapters[c.n - 1];
          return (
            <li key={c.n}>
              <Link href={c.href} onClick={() => track("chapter_open", { chapter: c.n })}
                className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50" data-testid="chapter" data-status={c.status}>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{ROUTE.chapter(c.n)}</p>
                    <p className="font-semibold">{info.title}</p>
                    <p className="text-sm text-muted-foreground">{info.text}</p>
                  </div>
                </div>
                <div className="mt-auto space-y-1.5">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    c.status === "done" ? "bg-ok/15 text-ok" : c.status === "progress" ? "bg-secondary text-primary" : "bg-muted text-muted-foreground")}>
                    {c.status === "done" ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />} {ROUTE.status[c.status]}
                  </span>
                  <Progress value={c.progress * 100} label={info.title} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/vibe" className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm hover:border-primary/50" data-testid="vibe-invite">
          <MessageSquareHeart className="h-6 w-6 shrink-0 text-primary" />
          <span className="flex-1"><b>{ROUTE.vibeInvite}</b><br /><span className="text-primary">{ROUTE.vibeInviteCta}</span></span>
        </Link>
        <Link href="/story" className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm hover:border-primary/50">
          <Briefcase className="h-6 w-6 shrink-0 text-primary" />
          <span className="flex-1"><b>{ROUTE.storyInvite}</b><br /><span className="text-primary">{ROUTE.storyInviteCta}</span></span>
        </Link>
      </div>
    </div>
  );
}
