import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/db/catalog";
import { findEvents } from "@/lib/llm/features";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Свежие мероприятия вуза (ИИ + web search, кэш 12 ч) с фолбэком на seed и страницу событий вуза. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("universityId");
  if (!id) return apiError("Не указан universityId", "Пример: /api/events?universityId=hse");
  const catalog = getCatalog();
  const uni = catalog.universities.find((u) => u.id === id);
  if (!uni) return apiError("Вуз не найден", "Список id — в data/universities.json", 404);
  const seed = catalog.events.filter((e) => e.universityId === id);
  const { events, source } = await findEvents(uni, seed);
  return NextResponse.json({ universityId: id, events, regular: source === "ai" ? seed : [], source, eventsUrl: uni.eventsUrl, admissionUrl: uni.admissionUrl });
}
