"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

export type UniLite = { id: string; short: string; name: string; city: string };

/** Поиск вуза по названию или городу (до 8 вариантов). */
export function UniPicker({ universities, value, onChange, placeholder, label, testid }: { universities: UniLite[]; value: UniLite | null; onChange: (u: UniLite | null) => void; placeholder: string; label: string; testid: string }) {
  const [q, setQ] = useState("");
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return universities.filter((u) => `${u.short} ${u.name} ${u.city}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, universities]);
  if (value)
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-primary/5 p-2 text-sm" data-testid={`${testid}-picked`}>
        <span><b>{value.short}</b> · {value.city}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="×" className="cursor-pointer rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
    );
  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={label} className="h-10 w-full rounded-lg border bg-background pl-9 pr-3" data-testid={testid} />
      </div>
      <ul className="space-y-1">
        {found.map((u) => (
          <li key={u.id}>
            <button type="button" onClick={() => onChange(u)} className="w-full cursor-pointer rounded-lg border p-2 text-left text-sm hover:bg-muted" data-testid={`${testid}-option`}>
              <b>{u.short}</b> · {u.city}<span className="block truncate text-xs text-muted-foreground">{u.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
