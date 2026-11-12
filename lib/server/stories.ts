import "server-only";
import { randomUUID } from "node:crypto";
import { docStore } from "./doc-store";
import type { Story, StoryInput } from "@/lib/stories";

const COLL = "stories";

export async function saveStory(input: StoryInput): Promise<Story> {
  const store = await docStore();
  const s: Story = { ...input, id: randomUUID(), status: "pending", createdAt: new Date().toISOString() };
  await store.upsert(COLL, s.id, s);
  return s;
}

export async function listStories(filter?: { status?: Story["status"]; universityId?: string }): Promise<Story[]> {
  const store = await docStore();
  return (await store.list(COLL))
    .map((d) => d.data as Story)
    .filter((s) => (!filter?.status || s.status === filter.status) && (!filter?.universityId || s.universityId === filter.universityId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setStoryStatus(id: string, status: Story["status"]) {
  const store = await docStore();
  const s = (await store.list(COLL)).find((d) => d.id === id)?.data as Story | undefined;
  if (!s) return;
  await store.upsert(COLL, id, { ...s, status });
}

export async function removeStory(id: string) {
  await (await docStore()).remove(COLL, id);
}
