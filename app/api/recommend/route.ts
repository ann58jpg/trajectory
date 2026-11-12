import { NextResponse } from "next/server";
import { StudentProfile, RecommendResponse } from "@/lib/schemas";
import { getCatalog } from "@/lib/db/catalog";
import { recommend } from "@/lib/engine/recommend";
import { parseDream } from "@/lib/llm/features";
import { aiMode } from "@/lib/llm";
import { apiError, zodHint } from "@/lib/api";
import { allVibes } from "@/lib/server/vibes";

export const dynamic = "force-dynamic";

/** Профиль → рекомендации (оба режима сразу, с сырыми факторами для ползунка). Анкету не сохраняем (152-ФЗ). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Некорректный JSON", "Отправьте объект StudentProfile в теле запроса");
  }
  const parsed = StudentProfile.safeParse(body);
  if (!parsed.success) return apiError("Профиль не прошёл проверку", zodHint(parsed.error));
  try {
    const profile = parsed.data;
    const mode = aiMode();
    if (profile.dream.trim().length >= 5) {
      const d = await parseDream(profile.dream);
      if (d.source === "ai") profile.aiTags = d.result.tags;
    }
    const sp = new URL(req.url).searchParams;
    const w = Number(sp.get("vibeWeight"));
    const vibes = await allVibes(sp.get("demo") === "1").catch(() => new Map());
    const result = recommend(getCatalog(), profile, mode, { vibes, vibeWeight: Number.isFinite(w) && w >= 0 && w <= 0.5 && sp.has("vibeWeight") ? w : undefined });
    const check = RecommendResponse.safeParse(result);
    if (!check.success) console.error("[recommend] ответ не прошёл схему:", zodHint(check.error));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[recommend]", e);
    return apiError("Не удалось посчитать рекомендации", "Попробуйте ещё раз; если повторяется — выполните npm run setup", 500);
  }
}
