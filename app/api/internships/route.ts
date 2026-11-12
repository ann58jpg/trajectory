import { NextResponse } from "next/server";
import { fetchInternships } from "@/lib/sources/hh";

export const dynamic = "force-dynamic";

/** Стажировки с hh.ru (если задано приложение hh), иначе { items: null } — UI покажет DataGap и ручной список. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const area = Number(sp.get("area"));
  const items = await fetchInternships(sp.get("q"), Number.isFinite(area) && area > 0 ? area : null);
  return NextResponse.json({ items });
}
