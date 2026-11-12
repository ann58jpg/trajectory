import Link from "next/link";
import { Compass, Sparkles, FlaskConical } from "lucide-react";
import { aiMode, getProvider } from "@/lib/llm";
import { BRAND, HEADER } from "@/lib/copy";
import { ThemeToggle } from "./theme-toggle";
import { TopBarControls } from "./top-bar";

export function SiteHeader() {
  const mode = aiMode();
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-card">
      <div className="flex h-14 items-center gap-2 px-3 md:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" data-testid="brand">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </span>
          <span className="hidden text-lg sm:inline">{BRAND}</span>
        </Link>
        {mode === "demo" ? (
          <span data-testid="demo-badge" title={HEADER.demoHint}
            className="inline-flex items-center gap-1 rounded-full border border-warn/50 bg-warn/15 px-1.5 py-0.5 text-xs font-medium sm:px-2">
            <FlaskConical className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{HEADER.demoShort}</span><span className="sr-only sm:hidden">{HEADER.demoShort}</span>
          </span>
        ) : (
          <span title={getProvider().label} className="hidden items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" /> {HEADER.aiOn}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <TopBarControls />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
