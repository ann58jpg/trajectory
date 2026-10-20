import { NextResponse } from "next/server";
import { z } from "zod";
import { StudentProfile } from "@/lib/schemas";
import { getCatalog } from "@/lib/db/catalog";
import { explain } from "@/lib/llm/features";
import { aiMode } from "@/lib/llm";
import { professionTemplate, universityTemplate } from "@/lib/engine/templates";
import { recommend } from "@/lib/engine/recommend";
import { apiError, zodHint } from "@/lib/api";

export const dynamic = "force-dynamic";

const Body = z.object({
  profileSummary: z.string().max(800).default(""),
  entityType: z.enum(["profession", "university"]),
  entityId: z.string().min(1),
  profile: StudentProfile.optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("Некорректный запрос", zodHint(parsed.error));
  const { profileSummary, entityType, entityId, profile } = parsed.data;
  const catalog = getCatalog();

  if (entityType === "profession") {
    const prof = catalog.professions.find((p) => p.id === entityId);
    if (!prof) return apiError("Профессия не найдена", "Проверьте entityId", 404);
    const rec = profile ? recommend(catalog, profile).recs.find((r) => r.professionId === entityId) ?? null : null;
    const facts = {
      профессия: prof.name,
      задачи: prof.tasks,
      навыки: prof.skills,
      стек: prof.stack,
      перспектива: { статус: prof.outlook.status, обоснование: prof.outlook.reason },
      ...(rec
        ? {
            зарплата_в_месяц: { старт: rec.salary.junior, через_3_5_лет: rec.salary.middle, опытный: rec.salary.senior, где: rec.salary.regionName },
            причины_совпадения: rec.reasons,
            можно_работать_с_курса: rec.earlyEntryCourse,
            программы: rec.programs.slice(0, 3).map((p) => `${p.universityShort}, ${p.city}: ${p.programName}`),
          }
        : {}),
      день_из_жизни_шаблон: prof.dayInLife,
    };
    const r = await explain(profileSummary, facts, () => professionTemplate(prof, rec));
    return NextResponse.json({ ...r, mode: aiMode() });
  }

  const uni = catalog.universities.find((u) => u.id === entityId);
  if (!uni) return apiError("Вуз не найден", "Проверьте entityId", 404);
  const programs = catalog.programs.filter((p) => p.universityId === uni.id).map((p) => p.name);
  const facts = {
    вуз: uni.name,
    город: uni.city,
    описание: uni.description,
    особенности: uni.features,
    общежитие: uni.dorm,
    военный_учебный_центр: uni.vuc,
    программы: programs,
  };
  const r = await explain(profileSummary, facts, () => universityTemplate(uni, programs));
  return NextResponse.json({ ...r, mode: aiMode() });
}
