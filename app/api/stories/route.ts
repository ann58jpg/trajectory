import { NextResponse } from "next/server";
import { StoryInput } from "@/lib/stories";
import { listStories, saveStory } from "@/lib/server/stories";

export const dynamic = "force-dynamic";

/** Опубликованные истории (все или одного вуза). Неопубликованные наружу не отдаём. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("universityId") ?? undefined;
  const list = await listStories({ status: "approved", universityId: u });
  return NextResponse.json({ stories: list.map(({ consent: _c, ...s }) => s) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = StoryInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const s = await saveStory(parsed.data);
  return NextResponse.json({ ok: true, id: s.id });
}
