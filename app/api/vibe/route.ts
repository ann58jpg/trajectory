import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, zodHint } from "@/lib/api";
import { getCatalog } from "@/lib/db/catalog";
import { allVibes, saveAnswer, uniVibe } from "@/lib/server/vibes";
import { LEISURE, ORDINAL, SPIRIT, TAGS } from "@/lib/vibe";

export const dynamic = "force-dynamic";

/** GET /api/vibe?universityId=hse[&demo=1] — вайб вуза (или null, пока меньше 10 ответов). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const id = sp.get("universityId");
  if (!id) return apiError("Не указан universityId", "Пример: /api/vibe?universityId=hse");
  if (!getCatalog().universities.some((u) => u.id === id)) return apiError("Вуз не найден", "Список id — в каталоге вузов", 404);
  const demo = sp.get("demo") === "1";
  const res = await uniVibe(id, demo);
  if (sp.get("similar") !== "1" || !res.vibe) return NextResponse.json(res);
  // 3 вуза с самым похожим вайбом (по средним шкал)
  const c = getCatalog();
  const all = await allVibes(demo);
  const dist = (a: NonNullable<typeof res.vibe>, b: NonNullable<typeof res.vibe>) => ORDINAL.reduce((s, k) => s + Math.abs(a.ordinal[k].mean - b.ordinal[k].mean), 0) / ORDINAL.length;
  const similar = [...all.values()].filter((v) => v.universityId !== id).sort((a, b) => dist(res.vibe!, a) - dist(res.vibe!, b)).slice(0, 3)
    .map((v) => ({ id: v.universityId, short: c.universities.find((u) => u.id === v.universityId)?.short ?? v.universityId, match: Math.round((1 - dist(res.vibe!, v)) * 100), vibe: v }));
  return NextResponse.json({ ...res, similar });
}

const Body = z.object({
  deviceId: z.string().min(6).max(64),
  universityId: z.string().max(80),
  faculty: z.string().trim().max(120).default(""),
  course: z.number().int().min(1).max(6),
  ordinal: z.record(z.enum(ORDINAL), z.array(z.number().int().min(0).max(2)).min(1).max(3)),
  leisure: z.array(z.enum(LEISURE)).max(9).default([]),
  spirit: z.array(z.enum(SPIRIT)).max(2).default([]),
  tags: z.array(z.enum(TAGS)).max(3).default([]),
});

/** POST /api/vibe — ответ студента о своём вузе. */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Тело запроса — не JSON", "Отправь ответы ещё раз");
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return apiError("Ответы заполнены с ошибкой", zodHint(parsed.error));
  const { deviceId, ...a } = parsed.data;
  if (!getCatalog().universities.some((u) => u.id === a.universityId)) return apiError("Вуз не найден", "Выбери вуз из списка", 404);
  if (a.faculty === "демо") a.faculty = "";
  const { replaced } = await saveAnswer(deviceId, a);
  return NextResponse.json({ ok: true, replaced, ...(await uniVibe(a.universityId, new URL(req.url).searchParams.get("demo") === "1")) });
}
