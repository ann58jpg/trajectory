import { NextResponse } from "next/server";
import { z } from "zod";
import { StudentProfile } from "@/lib/schemas";
import { getCatalog } from "@/lib/db/catalog";
import { buildUserModel } from "@/lib/engine/profile";
import { computeAllPrograms } from "@/lib/engine/scoring";
import { apiError, zodHint } from "@/lib/api";

export const dynamic = "force-dynamic";

const Body = z.object({
  profile: StudentProfile,
  professionId: z.string().optional(),
  specialtyCode: z.string().optional(),
  universityId: z.string().optional(),
});

/** Программы для карточек (профессия / специальность / вуз) с фильтрами и шансом под профиль. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("Некорректный запрос", zodHint(parsed.error));
  const { profile, professionId, specialtyCode, universityId } = parsed.data;
  const catalog = getCatalog();
  const model = buildUserModel(profile, catalog.egeSubjects, catalog.regions);
  const all = [...computeAllPrograms({ catalog, profile, model }).values()];
  let specs: string[] | null = null;
  if (professionId) specs = catalog.professions.find((p) => p.id === professionId)?.specialties ?? [];
  if (specialtyCode) specs = [specialtyCode];
  const list = all
    .filter((p) => (specs ? specs.includes(p.specialtyCode) : true))
    .filter((p) => (universityId ? p.universityId === universityId : true))
    .sort((a, b) => (a.excluded.length === 0 ? 0 : 1) - (b.excluded.length === 0 ? 0 : 1) || b.score - a.score);
  return NextResponse.json({ programs: list });
}
