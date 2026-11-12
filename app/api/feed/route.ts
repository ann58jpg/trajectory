import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/db/catalog";

export const dynamic = "force-dynamic";

/** Будущие события с датой: по списку вузов (?ids=a,b) или по всем. Только подтверждённые даты. */
export async function GET(req: Request) {
  const ids = new URL(req.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const c = getCatalog();
  const short = new Map(c.universities.map((u) => [u.id, u.short]));
  const events = c.events
    .filter((e) => e.date && e.date >= today && (!ids.length || ids.includes(e.universityId)))
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 40)
    .map((e) => ({ ...e, universityShort: short.get(e.universityId) ?? e.universityId }));
  return NextResponse.json({ events });
}
