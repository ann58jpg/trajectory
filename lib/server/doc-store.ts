import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Хранилище записей (ответы о вайбе вузов, истории выпускников): коллекция → id → JSON.
 * DATABASE_URL: postgres:// — Neon, libsql:// — Turso (та же база, что для аналитики).
 * Без неё — локальный SQLite-файл data/local-store.db (на Vercel — /tmp) с предупреждением в консоли.
 */
export type Doc<T> = { id: string; data: T; createdAt: string; updatedAt: string };

type Backend = {
  kind: string;
  upsert(collection: string, id: string, data: unknown): Promise<void>;
  list(collection: string): Promise<Doc<unknown>[]>;
  remove(collection: string, id: string): Promise<void>;
};

const g = globalThis as unknown as { __docStore?: Promise<Backend> };

async function make(): Promise<Backend> {
  const url = process.env.DATABASE_URL;
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    await sql.query("CREATE TABLE IF NOT EXISTS docs (collection TEXT NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (collection, id))");
    return {
      kind: "postgres",
      async upsert(c, id, data) {
        const now = new Date().toISOString();
        await sql.query("INSERT INTO docs (collection, id, data, created_at, updated_at) VALUES ($1,$2,$3,$4,$4) ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at", [c, id, JSON.stringify(data), now]);
      },
      async list(c) {
        const rows = (await sql.query("SELECT id, data, created_at, updated_at FROM docs WHERE collection = $1 ORDER BY created_at", [c])) as Record<string, unknown>[];
        return rows.map((r) => ({ id: String(r.id), data: r.data, createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString() }));
      },
      async remove(c, id) {
        await sql.query("DELETE FROM docs WHERE collection = $1 AND id = $2", [c, id]);
      },
    };
  }
  if (url) {
    const { createClient } = await import("@libsql/client");
    const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
    await db.execute("CREATE TABLE IF NOT EXISTS docs (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection, id))");
    return {
      kind: "libsql",
      async upsert(c, id, data) {
        const now = new Date().toISOString();
        await db.execute({ sql: "INSERT INTO docs (collection, id, data, created_at, updated_at) VALUES (?,?,?,?,?) ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at", args: [c, id, JSON.stringify(data), now, now] });
      },
      async list(c) {
        const r = await db.execute({ sql: "SELECT id, data, created_at, updated_at FROM docs WHERE collection = ? ORDER BY created_at", args: [c] });
        return r.rows.map((x) => ({ id: String(x.id), data: JSON.parse(String(x.data)), createdAt: String(x.created_at), updatedAt: String(x.updated_at) }));
      },
      async remove(c, id) {
        await db.execute({ sql: "DELETE FROM docs WHERE collection = ? AND id = ?", args: [c, id] });
      },
    };
  }
  // локально: отдельный файл SQLite, чтобы не трогать базу справочников
  const Database = (await import("better-sqlite3")).default;
  const file = process.env.VERCEL ? path.join(os.tmpdir(), "local-store.db") : path.resolve(/* turbopackIgnore: true */ process.env.LOCAL_STORE_PATH ?? "./data/local-store.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  console.warn(`[store] DATABASE_URL не задан — ответы и истории хранятся локально в ${file}`);
  const db = new Database(file);
  db.exec("CREATE TABLE IF NOT EXISTS docs (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection, id))");
  return {
    kind: "local",
    async upsert(c, id, data) {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO docs (collection, id, data, created_at, updated_at) VALUES (?,?,?,?,?) ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at").run(c, id, JSON.stringify(data), now, now);
    },
    async list(c) {
      return (db.prepare("SELECT id, data, created_at, updated_at FROM docs WHERE collection = ? ORDER BY created_at").all(c) as Record<string, string>[])
        .map((x) => ({ id: x.id, data: JSON.parse(x.data), createdAt: x.created_at, updatedAt: x.updated_at }));
    },
    async remove(c, id) {
      db.prepare("DELETE FROM docs WHERE collection = ? AND id = ?").run(c, id);
    },
  };
}

export async function docStore(): Promise<Backend> {
  g.__docStore ??= make();
  return g.__docStore;
}
