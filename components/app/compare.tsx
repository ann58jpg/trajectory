"use client";
import Link from "next/link";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare, type CompareItem } from "@/lib/client/storage";
import { COMMON, COMPARE } from "@/lib/copy";
import { cn } from "@/lib/utils";

export const COMPARE_MAX = 4;

/** Галочка «Сравнить» на любой карточке. */
export function CompareToggle({ kind, id }: CompareItem) {
  const [items, setItems, ready] = useCompare();
  const on = ready && items.some((x) => x.kind === kind && x.id === id);
  const full = items.filter((x) => x.kind === kind).length >= COMPARE_MAX;
  const toggle = () =>
    setItems((list) => (list.some((x) => x.kind === kind && x.id === id) ? list.filter((x) => !(x.kind === kind && x.id === id)) : full ? list : [...list, { kind, id }]));
  return (
    <Button
      size="sm"
      variant={on ? "secondary" : "outline"}
      onClick={toggle}
      aria-pressed={on}
      disabled={!on && full}
      title={!on && full ? COMPARE.limit : undefined}
      data-testid={`compare-${kind}-${id}`}
    >
      <GitCompare className={cn(on && "text-primary")} />
      {on ? COMMON.inCompare : COMMON.compare}
    </Button>
  );
}

/** Плашка внизу экрана: «Сравнить (3)». */
export function CompareTray() {
  const [items, setItems, ready] = useCompare();
  if (!ready || items.length === 0) return null;
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur" data-testid="compare-tray">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        <Button asChild size="sm">
          <Link href="/compare" data-testid="compare-open">
            <GitCompare /> {COMPARE.tray(items.length)}
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setItems([])}>
          <X /> {COMPARE.clear}
        </Button>
      </div>
    </div>
  );
}
