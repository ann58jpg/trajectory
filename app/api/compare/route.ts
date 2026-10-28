import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/db/catalog";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Данные вузов для страницы сравнения: GET /api/compare?universities=msu,hse */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("universities") ?? "").split(",").filter(Boolean).slice(0, 4);
  if (!ids.length) return apiError("Не указаны вузы", "Пример: /api/compare?universities=msu,hse");
  const c = getCatalog();
  const universities = ids
    .map((id) => c.universities.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => ({
      id: u.id, name: u.name, short: u.short, city: u.city, dorm: u.dorm, vuc: u.vuc, budget: u.budget,
      priceFrom: u.priceFrom, priceTo: u.priceTo, priceConfidence: u.priceMeta.confidence, employers: u.ratings.employers,
      programs: c.programs.filter((p) => p.universityId === u.id).length,
    }));
  return NextResponse.json({ universities });
}
