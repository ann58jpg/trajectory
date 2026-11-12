"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Map, Newspaper, Sparkles, UserRound } from "lucide-react";
import { NAV } from "@/lib/copy";
import { cn } from "@/lib/utils";

/** 5 разделов. Остальные страницы относятся к одному из них — так подсвечивается вкладка. */
export const TABS = [
  { href: "/", label: NAV.route, icon: Map, match: (p: string) => p === "/" || p.startsWith("/plan") || p.startsWith("/life") || p.startsWith("/career") },
  { href: "/results", label: NAV.match, icon: Sparkles, match: (p: string) => /^\/(results|quiz|specialty|profession|compare)/.test(p) },
  { href: "/universities", label: NAV.unis, icon: Building2, match: (p: string) => /^\/(universities|university)/.test(p) },
  { href: "/feed", label: NAV.feed, icon: Newspaper, match: (p: string) => p.startsWith("/feed") },
  { href: "/profile", label: NAV.profile, icon: UserRound, match: (p: string) => p.startsWith("/profile") },
];

export function AppNav() {
  const path = usePathname() ?? "/";
  return (
    <>
      {/* компьютер: боковое меню */}
      <nav aria-label={NAV.label} className="no-print sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 flex-col gap-1 border-r bg-card px-3 py-4 md:flex" data-testid="side-nav">
        {TABS.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} aria-current={match(path) ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors", match(path) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted")}>
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>
      {/* телефон: 5 вкладок внизу */}
      <nav aria-label={NAV.label} className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden" data-testid="bottom-nav">
        {TABS.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} aria-current={match(path) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", match(path) ? "text-primary" : "text-muted-foreground")}>
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
