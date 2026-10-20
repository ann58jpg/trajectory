import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "./schema";

export const dbPath = () => path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH ?? "./data/trajectory.db");

let instance: BetterSQLite3Database<typeof schema> | null = null;

/**
 * На serverless-платформах (Vercel) файлы функции доступны только для чтения.
 * База, собранная при деплое, копируется в /tmp — там работает кэш hh.ru и ИИ (на время жизни инстанса).
 * Если копирование не удалось, база открывается только для чтения, а кэш живёт в памяти.
 */
function openRuntime(file: string): Database.Database {
  const serverless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (serverless) {
    const tmp = path.join(os.tmpdir(), "trajectory.db");
    try {
      if (!fs.existsSync(tmp)) fs.copyFileSync(file, tmp);
      return new Database(tmp);
    } catch (e) {
      console.warn("[db] не удалось скопировать БД в /tmp, открываю только для чтения:", e);
      return new Database(file, { readonly: true, fileMustExist: true });
    }
  }
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  return db;
}

/** Возвращает подключение или null, если БД ещё не создана (`npm run setup`). */
export function getDb(): BetterSQLite3Database<typeof schema> | null {
  if (instance) return instance;
  const file = dbPath();
  if (!fs.existsSync(file)) return null;
  try {
    instance = drizzle(openRuntime(file), { schema });
    return instance;
  } catch (e) {
    console.error("[db] не удалось открыть SQLite:", e);
    return null;
  }
}

export function openDbForSetup(): { db: BetterSQLite3Database<typeof schema>; sqlite: Database.Database } {
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  // один самодостаточный файл без -wal/-shm: его можно включить в сборку и скопировать
  sqlite.pragma("journal_mode = DELETE");
  return { db: drizzle(sqlite, { schema }), sqlite };
}
