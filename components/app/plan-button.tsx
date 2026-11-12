"use client";
import { FavButton, type FavKind } from "./fav-button";

/** Старое имя кнопки «В избранное» (раньше — «В мой план»). */
export function PlanButton({ kind, id, size = "sm", label }: { kind: FavKind; id: string; size?: "sm" | "default"; label?: string }) {
  return <FavButton kind={kind} id={id} size={size} label={label} compact={label === "★"} />;
}
