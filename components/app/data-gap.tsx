import { DatabaseZap } from "lucide-react";
import { DATA_GAP } from "@/lib/copy";
import { cn } from "@/lib/utils";

/**
 * Пробел в данных: что должно быть здесь, где это взять. Правило показа цифр в приложении:
 * подтверждено → цифра с источником; оценка → цифра с пометкой «оценка»; данных нет → DataGap.
 */
export function DataGap({ what, where, compact = false, className }: { what: string; where: string; compact?: boolean; className?: string }) {
  if (compact)
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-1 rounded border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground", className)} data-testid="data-gap" title={`${DATA_GAP.where} ${where}`}>
        <DatabaseZap className="h-3 w-3" aria-hidden /> {what}: {DATA_GAP.badge.toLowerCase()}
      </span>
    );
  return (
    <div className={cn("rounded-lg border-2 border-dashed p-3 text-sm", className)} data-testid="data-gap">
      <p className="flex items-center gap-1.5 font-medium"><DatabaseZap className="h-4 w-4 text-muted-foreground" aria-hidden /> {what}</p>
      <p className="mt-1 text-xs text-muted-foreground">{DATA_GAP.badge}. {DATA_GAP.where} {where}</p>
    </div>
  );
}
