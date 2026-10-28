import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, zodHint } from "@/lib/api";
import { getTrackStore } from "@/lib/server/track-store";

export const dynamic = "force-dynamic";

const EVENTS = [
  "landing_view", "quiz_start", "quiz_block_done", "quiz_complete", "results_view", "mode_switch", "profession_open",
  "university_open", "event_click", "plan_add", "compare_open", "report_download", "report_share", "feedback",
] as const;

// Только короткие значения: id, режимы, блоки, оценки. Длинные строки обрезаем — личные данные сюда не попадают.
const Body = z.object({
  event: z.enum(EVENTS),
  props: z.record(z.string().max(40), z.union([z.string().max(80), z.number(), z.boolean(), z.null()])).default({}),
  sessionId: z.string().min(6).max(64),
  path: z.string().max(120).default("/"),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = JSON.parse(await req.text());
  } catch {
    return apiError("Тело запроса — не JSON", "Пример: {\"event\":\"landing_view\",\"sessionId\":\"…\"}");
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return apiError("Неверное событие", zodHint(parsed.error));
  const { event, props, sessionId, path } = parsed.data;
  if (event === "feedback" && !(typeof props.rating === "number" && props.rating >= 1 && props.rating <= 5)) {
    return apiError("Оценка должна быть от 1 до 5", "props.rating: 1..5");
  }
  const store = await getTrackStore();
  await store.insert({ ts: new Date().toISOString(), session: sessionId, event, props, path });
  return NextResponse.json({ ok: true, store: store.kind });
}
