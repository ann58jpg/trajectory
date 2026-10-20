import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { cache } from "./schema";

const memory = new Map<string, { payload: string; createdAt: number }>();

/** Кэш в SQLite (с фолбэком на память процесса, если БД не создана). */
export function cacheGet<T>(key: string, ttlMs: number): T | null {
  const now = Date.now();
  const db = getDb();
  let row: { payload: string; createdAt: number } | undefined;
  try {
    row = db ? db.select().from(cache).where(eq(cache.key, key)).get() : memory.get(key);
  } catch {
    row = memory.get(key);
  }
  if (!row || now - row.createdAt > ttlMs) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown) {
  const entry = { payload: JSON.stringify(value), createdAt: Date.now() };
  memory.set(key, entry);
  const db = getDb();
  if (!db) return;
  try {
    db.insert(cache).values({ key, ...entry }).onConflictDoUpdate({ target: cache.key, set: entry }).run();
  } catch (e) {
    console.warn("[cache] запись не удалась:", e);
  }
}
