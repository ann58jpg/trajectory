"use client";
import Link from "next/link";
import { Info } from "lucide-react";
import { PLAN } from "@/lib/copy";

/** Мягкая подсказка, если глава открыта без теста. */
export function TestFirstHint() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-secondary p-3 text-sm" data-testid="test-first">
      <Info className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1">{PLAN.testFirst}</span>
      <Link href="/quiz" className="font-medium text-primary hover:underline">{PLAN.testFirstCta}</Link>
    </div>
  );
}
