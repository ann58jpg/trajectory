import "server-only";

/** Хранилище событий воронки: внешняя БД по DATABASE_URL (Neon — postgres://, Turso — libsql://), иначе консоль и память процесса. */
export type TrackRow = { ts: string; session: string; event: string; props: Record<string, unknown>; path: string };

type Store = { insert(row: TrackRow): Promise<void>; list(from: string, to: string): Promise<TrackRow[]>; kind: string };

// в dev маршруты собираются отдельно — общую память держим в globalThis
const g = globalThis as unknown as { __trackMemory?: TrackRow[]; __trackStore?: Promise<Store> };
const memory: TrackRow[] = (g.__trackMemory ??= []);
const memoryStore: Store = {
  kind: "memory",
  async insert(row) {
    console.log("[track]", row.event, JSON.stringify(row.props));
    memory.push(row);
    if (memory.length > 5000) memory.shift();
  },
  async list(from, to) {
    return memory.filter((r) => r.ts >= from && r.ts <= to);
  },
};

const DDL_PG = "CREATE TABLE IF NOT EXISTS track_events (id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL, session TEXT NOT NULL, event TEXT NOT NULL, props JSONB NOT NULL, path TEXT NOT NULL)";
const DDL_SQLITE = "CREATE TABLE IF NOT EXISTS track_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, session TEXT NOT NULL, event TEXT NOT NULL, props TEXT NOT NULL, path TEXT NOT NULL)";


async function makeStore(): Promise<Store> {
  const url = process.env.DATABASE_URL;
  if (!url) return memoryStore;
  if (/^postgres(ql)?:\/\//.test(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    await sql.query(DDL_PG);
    return {
      kind: "postgres",
      async insert(r) {
        await sql.query("INSERT INTO track_events (ts, session, event, props, path) VALUES ($1, $2, $3, $4, $5)", [r.ts, r.session, r.event, JSON.stringify(r.props), r.path]);
      },
      async list(from, to) {
        const rows = (await sql.query("SELECT ts, session, event, props, path FROM track_events WHERE ts >= $1 AND ts <= $2 ORDER BY ts LIMIT 200000", [from, to])) as Record<string, unknown>[];
        return rows.map((x) => ({ ts: new Date(x.ts as string).toISOString(), session: String(x.session), event: String(x.event), props: (x.props as Record<string, unknown>) ?? {}, path: String(x.path) }));
      },
    };
  }
  const { createClient } = await import("@libsql/client");
  const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  await db.execute(DDL_SQLITE);
  return {
    kind: "libsql",
    async insert(r) {
      await db.execute({ sql: "INSERT INTO track_events (ts, session, event, props, path) VALUES (?, ?, ?, ?, ?)", args: [r.ts, r.session, r.event, JSON.stringify(r.props), r.path] });
    },
    async list(from, to) {
      const res = await db.execute({ sql: "SELECT ts, session, event, props, path FROM track_events WHERE ts >= ? AND ts <= ? ORDER BY ts LIMIT 200000", args: [from, to] });
      return res.rows.map((x) => ({ ts: String(x.ts), session: String(x.session), event: String(x.event), props: JSON.parse(String(x.props)), path: String(x.path) }));
    },
  };
}

export async function getTrackStore(): Promise<Store> {
  g.__trackStore ??= makeStore().catch((e) => {
    console.error("[track] внешняя БД недоступна, пишем в консоль:", (e as Error).message);
    return memoryStore;
  });
  return g.__trackStore;
}
