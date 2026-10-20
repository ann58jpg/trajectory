import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export const dbPath = () => path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH ?? "./data/trajectory.db");

let instance: BetterSQLite3Database<typeof schema> | null = null;

/** Возвращает подключение или null, если БД ещё не создана (`npm run setup`). */
export function getDb(): BetterSQLite3Database<typeof schema> | null {
  if (instance) return instance;
  const file = dbPath();
  if (!fs.existsSync(file)) return null;
  try {
    const sqlite = new Database(file);
    sqlite.pragma("journal_mode = WAL");
    instance = drizzle(sqlite, { schema });
    return instance;
  } catch (e) {
    console.error("[db] не удалось открыть SQLite:", e);
    return null;
  }
}

export function openDbForSetup(): BetterSQLite3Database<typeof schema> {
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}
