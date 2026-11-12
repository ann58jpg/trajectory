"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { CRUMBS } from "@/lib/copy";

export type Crumb = { label: string; href?: string };

/** «Назад» и хлебные крошки: Маршрут → Подбор → Экономика → ВШЭ. «Назад» возвращает на прошлую страницу, а без истории — на родителя. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const router = useRouter();
  const parent = [...items].reverse().find((x) => x.href)?.href ?? "/";
  const back = () => (window.history.length > 1 ? router.back() : router.push(parent));
  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-sm" data-testid="breadcrumbs">
      <button type="button" onClick={back} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border bg-card px-2.5 py-1 font-medium hover:bg-muted" data-testid="back">
        <ArrowLeft className="h-4 w-4" /> {CRUMBS.back}
      </button>
      <nav aria-label={CRUMBS.label}>
        <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
          {items.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
              {c.href && i < items.length - 1 ? <Link href={c.href} className="hover:text-foreground hover:underline">{c.label}</Link> : <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-foreground">{c.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
