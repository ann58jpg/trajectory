import Link from "next/link";
import { Compass, Sparkles, FlaskConical, ClipboardList, BarChart3, Star } from "lucide-react";
import { aiMode, getProvider } from "@/lib/llm";
import { BRAND, HEADER } from "@/lib/copy";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const mode = aiMode();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Compass className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">{BRAND}</span>
        </Link>
        <nav aria-label={HEADER.navLabel} className="ml-1 flex items-center gap-0.5 text-sm">
          {[
            { href: "/quiz", label: HEADER.nav.quiz, icon: ClipboardList },
            { href: "/results", label: HEADER.nav.results, icon: BarChart3 },
            { href: "/plan", label: HEADER.nav.plan, icon: Star },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-label={label} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted">
              <Icon className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {mode === "demo" ? (
            <span
              data-testid="demo-badge"
              title={HEADER.demoHint}
              className="inline-flex items-center gap-1 rounded-full border border-warn/50 bg-warn/15 px-2.5 py-1 text-xs font-medium"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="sm:hidden">{HEADER.demoShort}</span>
              <span className="hidden sm:inline">{HEADER.demoLong}</span>
            </span>
          ) : (
            <span title={getProvider().label} className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {HEADER.aiOn}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
