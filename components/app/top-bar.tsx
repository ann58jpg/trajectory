"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleHelp, UserRound } from "lucide-react";
import { admissionYear, savedCount, usePlan, useProfile, useSettings } from "@/lib/storage";
import { TOPBAR } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { HowTo } from "./how-to";

/** Переключатель уровня (работает только ВО), год поступления, «Как пользоваться», профиль со счётчиком. */
export function TopBarControls() {
  const [settings, setSettings, ready] = useSettings();
  const [profile] = useProfile();
  const [plan, , planReady] = usePlan();
  const [howTo, setHowTo] = useState(false);
  const year = admissionYear(settings, profile.grade);
  const count = planReady ? savedCount(plan) : 0;
  useEffect(() => {
    const open = () => setHowTo(true);
    window.addEventListener("trajectory:howto", open);
    return () => window.removeEventListener("trajectory:howto", open);
  }, []);

  return (
    <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5">
      <div className="flex items-center rounded-lg border bg-card p-0.5 text-[11px] md:text-xs" role="radiogroup" aria-label={TOPBAR.level}>
        {(["vo", "spo", "mag"] as const).map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={l === "vo"}
            disabled={l !== "vo"}
            title={TOPBAR.levelsFull[l] + (l !== "vo" ? ` — ${TOPBAR.soon}` : "")}
            className={cn("rounded-md px-1 py-1 font-medium md:px-2", l === "vo" ? "bg-primary text-primary-foreground" : "cursor-not-allowed text-muted-foreground")}
            data-testid={`level-${l}`}
          >
            <span className="md:hidden">{TOPBAR.levelsShort[l]}</span>
            <span className="hidden md:inline">{TOPBAR.levels[l]}</span>
            {l !== "vo" && <span className="ml-1 hidden rounded bg-muted px-1 text-[10px] md:inline">{TOPBAR.soon}</span>}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="year-select">{TOPBAR.year}</label>
      <select
        id="year-select"
        value={ready ? String(year) : "2027"}
        onChange={(e) => setSettings((s) => ({ ...s, year: Number(e.target.value) as 2027 | 2028 }))}
        className="h-8 rounded-lg border bg-card px-1 text-sm sm:px-1.5"
        title={TOPBAR.year}
        data-testid="year-select"
      >
        <option value="2027">2027</option>
        <option value="2028">2028</option>
      </select>
      <button type="button" onClick={() => setHowTo(true)} className="inline-flex h-8 items-center gap-1 rounded-lg px-1.5 text-sm hover:bg-muted sm:px-2" data-testid="howto-open">
        <CircleHelp className="h-4 w-4" /> <span className="hidden lg:inline">{TOPBAR.howTo}</span>
      </button>
      <Link href="/profile" className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted" aria-label={TOPBAR.profile} title={TOPBAR.saved(count)} data-testid="profile-icon">
        <UserRound className="h-5 w-5" />
        {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground" data-testid="saved-count">{count}</span>}
      </Link>
      {howTo && <HowTo onClose={() => setHowTo(false)} />}
    </div>
  );
}
