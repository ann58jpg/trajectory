"use client";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan, type Plan } from "@/lib/client/storage";
import { cn } from "@/lib/utils";

type Kind = "professions" | "universities" | "programs";

export function PlanButton({ kind, id, size = "sm", label = "В мой план" }: { kind: Kind; id: string; size?: "sm" | "default"; label?: string }) {
  const [plan, setPlan, ready] = usePlan();
  const inPlan = ready && plan[kind].includes(id);
  const toggle = () =>
    setPlan((p: Plan) => ({ ...p, [kind]: p[kind].includes(id) ? p[kind].filter((x) => x !== id) : [...p[kind], id] }));
  return (
    <Button variant={inPlan ? "secondary" : "outline"} size={size} onClick={toggle} aria-pressed={inPlan} data-testid={`plan-${kind}-${id}`}>
      <Star className={cn(inPlan && "fill-current text-warn")} />
      {inPlan ? "В плане" : label}
    </Button>
  );
}
