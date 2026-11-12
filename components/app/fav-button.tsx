"use client";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan, type Plan } from "@/lib/storage";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { COMMON } from "@/lib/copy";

export type FavKind = "professions" | "specialties" | "universities" | "programs" | "internships";

/** «В избранное ★» — на всех карточках. compact — только звёздочка (для списков). */
export function FavButton({ kind, id, compact = false, size = "sm", label = COMMON.fav }: { kind: FavKind; id: string; compact?: boolean; size?: "sm" | "default"; label?: string }) {
  const [plan, setPlan, ready] = usePlan();
  const on = ready && plan[kind].includes(id);
  const toggle = () => {
    if (!on) track("favorite_add", { kind, id });
    setPlan((p: Plan) => ({ ...p, [kind]: p[kind].includes(id) ? p[kind].filter((x) => x !== id) : [...p[kind], id] }));
  };
  return (
    <Button variant={on ? "secondary" : "outline"} size={compact ? "icon" : size} onClick={toggle} aria-pressed={on} aria-label={on ? COMMON.inFav : label}
      title={on ? COMMON.inFav : label} className={cn(compact && "h-9 w-9 shrink-0")} data-testid={`fav-${kind}-${id}`}>
      <Star className={cn(on && "fill-current text-warn")} />
      {!compact && (on ? COMMON.inFav : label)}
    </Button>
  );
}
