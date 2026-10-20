import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Маленький значок источника рядом с цифрой. У оценок — пометка «оценка». */
export function SourceMark({ source, confidence, updatedAt, className }: { source: string; confidence?: "verified" | "estimate"; updatedAt?: string; className?: string }) {
  const title = `Источник: ${source}${updatedAt ? ` · обновлено ${updatedAt}` : ""}${confidence === "verified" ? " · проверено" : confidence === "estimate" ? " · оценка" : ""}`;
  return (
    <span className={cn("inline-flex items-center gap-0.5 align-middle text-[11px] font-normal text-muted-foreground", className)} title={title}>
      <Info className="h-3 w-3" aria-hidden />
      <span className="sr-only">{title}</span>
      {confidence === "estimate" && <span aria-hidden>оценка</span>}
      {confidence === "verified" && <span aria-hidden className="text-ok">проверено</span>}
    </span>
  );
}
