import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/db/catalog";
import { fetchMarket } from "@/lib/sources/hh";
import { cityCoef } from "@/lib/engine/scoring";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Рынок труда по профессии и региону: hh.ru (кэш 24 ч) или seed-оценка. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const catalog = getCatalog();
  const prof = catalog.professions.find((p) => p.id === sp.get("professionId"));
  if (!prof) return apiError("Профессия не найдена", "Пример: /api/market?professionId=backend&regionId=samara", 404);
  const region = catalog.regions.find((r) => r.id === sp.get("regionId")) ?? null;
  const coef = region ? cityCoef(region, null) : 1;
  const seed = {
    vacanciesRegion: region ? Math.round(prof.demand.vacanciesRF * region.vacancyShare * (prof.industries.some((i) => region.industries.includes(i)) ? 1.5 : 0.8)) : null,
    vacanciesRF: prof.demand.vacanciesRF,
    trend: prof.demand.trend,
    salaryMiddleRegion: Math.round((prof.salary.middle * coef) / 1000) * 1000,
    meta: prof.demand.meta,
  };
  const [hhRegion, hhRF] = await Promise.all([
    region?.hhAreaId ? fetchMarket(prof.hhQuery, region.hhAreaId) : Promise.resolve(null),
    fetchMarket(prof.hhQuery, null),
  ]);
  return NextResponse.json({ professionId: prof.id, regionId: region?.id ?? null, hhRegion, hhRF, seed });
}
