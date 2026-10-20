import * as React from "react";
import { cn } from "@/lib/utils";

export const Progress = ({ value, className, label }: { value: number; className?: string; label?: string }) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value)}
    className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
  >
    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-md bg-muted", className)} />;

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn("flex h-11 w-full rounded-md border bg-card px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm", className)}
    {...p}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn("flex min-h-28 w-full rounded-md border bg-card px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm", className)}
    {...p}
  />
));
Textarea.displayName = "Textarea";

/** Кнопка-«чип» для вариантов ответа (одиночный и множественный выбор). */
export function Chip({
  selected, onClick, children, className, disabled, role = "checkbox",
}: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean; role?: "checkbox" | "radio" }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-lg border px-3.5 py-2 text-left text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        selected ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary" : "bg-card hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}
