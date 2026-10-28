"use client";
import { Navigation } from "lucide-react";
import { useProfile } from "@/lib/client/storage";
import { UNIVERSITY } from "@/lib/copy";

/** «Как добраться» — показываем, если вуз в городе пользователя. */
export function HowToGet({ city, howToGet }: { city: string; howToGet: string }) {
  const [p, , ready] = useProfile();
  if (!ready) return null;
  const local = p.city === city;
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-sm">
      <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        <b>{local ? UNIVERSITY.howHome : UNIVERSITY.where}</b>{" "}
        {howToGet}
        {!local && p.city && <span className="text-muted-foreground">{UNIVERSITY.otherCity(p.city)}</span>}
      </p>
    </div>
  );
}
