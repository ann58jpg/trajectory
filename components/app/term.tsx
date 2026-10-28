import { Info } from "lucide-react";
import { GLOSSARY } from "@/lib/copy";
import { cn } from "@/lib/utils";

/** Понятная подпись термина + подсказка ⓘ с объяснением. */
export function Term({ k, children, className }: { k: keyof typeof GLOSSARY; children?: React.ReactNode; className?: string }) {
  const g = GLOSSARY[k];
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} title={g.hint}>
      {children ?? g.label}
      <Info className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      <span className="sr-only">. {g.hint}</span>
    </span>
  );
}
