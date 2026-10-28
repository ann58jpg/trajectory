import { Info } from "lucide-react";
import { COMMON } from "@/lib/copy";
import { cn } from "@/lib/utils";

/** Значок источника рядом с цифрой. У оценок — подпись «оценка». */
export function SourceMark({ source, confidence, updatedAt, className }: { source: string; confidence?: "verified" | "estimate"; updatedAt?: string; className?: string }) {
  const title = `${COMMON.source}: ${source}${updatedAt ? ` · ${COMMON.updated} ${updatedAt}` : ""}${confidence === "verified" ? ` · ${COMMON.verified}` : confidence === "estimate" ? ` · ${COMMON.estimate}` : ""}`;
  return (
    <span className={cn("inline-flex items-center gap-0.5 align-middle text-[11px] font-normal text-muted-foreground", className)} title={title}>
      <Info className="h-3 w-3" aria-hidden />
      <span className="sr-only">{title}</span>
      {confidence === "estimate" && <span aria-hidden>{COMMON.estimate}</span>}
      {confidence === "verified" && <span aria-hidden className="text-ok">{COMMON.verified}</span>}
    </span>
  );
}
