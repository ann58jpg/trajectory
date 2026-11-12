import "server-only";
import { docStore } from "./doc-store";
import { aggregate, demoAnswers, MIN_ANSWERS, type UniVibe, type VibeAnswer } from "@/lib/vibe";

const COLL = "vibe";

/** Ответы студентов по вузам (реальные + демо, если включён «Демо-вайб»). */
export async function answersByUni(demo: boolean): Promise<Map<string, VibeAnswer[]>> {
  const store = await docStore();
  const rows = await store.list(COLL);
  const by = new Map<string, VibeAnswer[]>();
  for (const r of rows) {
    const a = r.data as VibeAnswer;
    by.set(a.universityId, [...(by.get(a.universityId) ?? []), a]);
  }
  if (demo) {
    for (const [uid] of [...by.entries()]) by.set(uid, [...demoAnswers(uid), ...(by.get(uid) ?? [])]);
    const { DEMO_UNIS } = await import("@/lib/vibe");
    for (const uid of DEMO_UNIS) if (!by.has(uid)) by.set(uid, demoAnswers(uid));
  }
  return by;
}

/** Вайб вуза или null, пока ответов меньше 10, и сколько ответов уже есть. */
export async function uniVibe(universityId: string, demo: boolean): Promise<{ vibe: UniVibe | null; count: number; realCount: number }> {
  const by = await answersByUni(demo);
  const list = by.get(universityId) ?? [];
  const real = list.filter((a) => a.faculty !== "демо").length;
  const usedDemo = demo && list.length > real;
  return { vibe: aggregate(universityId, list, usedDemo), count: list.length, realCount: real };
}

/** Вайбы всех вузов, где набралось 10 ответов. */
export async function allVibes(demo: boolean): Promise<Map<string, UniVibe>> {
  const by = await answersByUni(demo);
  const out = new Map<string, UniVibe>();
  for (const [uid, list] of by) {
    if (list.length < MIN_ANSWERS) continue;
    const real = list.filter((a) => a.faculty !== "демо").length;
    const v = aggregate(uid, list, demo && list.length > real);
    if (v) out.set(uid, v);
  }
  return out;
}

/** Одно устройство — один ответ на вуз: повторный ответ заменяет предыдущий. */
export async function saveAnswer(deviceId: string, a: VibeAnswer): Promise<{ replaced: boolean }> {
  const store = await docStore();
  const id = `${deviceId}:${a.universityId}`;
  const replaced = (await store.list(COLL)).some((r) => r.id === id);
  await store.upsert(COLL, id, a);
  return { replaced };
}
