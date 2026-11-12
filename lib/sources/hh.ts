import "server-only";
import { cacheGet, cacheSet } from "@/lib/db/cache";

export type MarketStats = {
  found: number;
  salaryMedian: number | null;
  salaryP25: number | null;
  salaryP75: number | null;
  sample: number;
  area: number | null;
  source: "hh" | "seed";
  fetchedAt: string;
  url: string;
};

const TTL = 24 * 3600_000;

/**
 * Публичный API hh.ru: число вакансий и зарплатные вилки по запросу и региону (area).
 * Требует заголовок HH-User-Agent вида "app/version (email)". Любая ошибка → null (UI берёт seed).
 */
export async function fetchMarket(query: string, area: number | null): Promise<MarketStats | null> {
  const key = `hh:${query}:${area ?? "rf"}`;
  const cached = cacheGet<MarketStats>(key, TTL);
  if (cached) return cached;
  const ua = process.env.HH_USER_AGENT;
  if (!ua) return null;
  const params = new URLSearchParams({ text: query, per_page: "100", only_with_salary: "true", search_field: "name" });
  if (area) params.set("area", String(area));
  const url = `https://api.hh.ru/vacancies?${params}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { headers: { "HH-User-Agent": ua, "User-Agent": ua }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null; // 403 (нужен токен/капча) и т.п. — фолбэк
    const json = (await res.json()) as {
      found: number;
      items: { salary: { from: number | null; to: number | null; currency: string; gross?: boolean } | null }[];
    };
    const values = json.items
      .map((i) => i.salary)
      .filter((s): s is NonNullable<typeof s> => !!s && s.currency === "RUR")
      .map((s) => (s.from && s.to ? (s.from + s.to) / 2 : (s.from ?? s.to ?? 0)))
      .filter((v) => v > 10000)
      .sort((a, b) => a - b);
    const q = (p: number) => (values.length ? Math.round(values[Math.floor((values.length - 1) * p)] / 1000) * 1000 : null);
    // found здесь — вакансии с указанной зарплатой (нижняя оценка спроса)
    const stats: MarketStats = {
      found: json.found,
      salaryMedian: q(0.5),
      salaryP25: q(0.25),
      salaryP75: q(0.75),
      sample: values.length,
      area,
      source: "hh",
      fetchedAt: new Date().toISOString(),
      url: `https://hh.ru/search/vacancy?${new URLSearchParams({ text: query, ...(area ? { area: String(area) } : {}) })}`,
    };
    cacheSet(key, stats);
    return stats;
  } catch {
    return null;
  }
}

/* ───────── Стажировки и вакансии без опыта ───────── */

import type { HhVacancy } from "./hh-types";
export type { HhVacancy };

let tokenCache: { token: string; until: number } | null = null;

/**
 * Токен приложения hh.ru (client_credentials). Поиск вакансий /vacancies без токена с серверов отвечает 403,
 * поэтому нужно зарегистрировать приложение на dev.hh.ru (см. README → «Стажировки с hh.ru»).
 */
async function appToken(): Promise<string | null> {
  if (tokenCache && tokenCache.until > Date.now()) return tokenCache.token;
  const id = process.env.HH_CLIENT_ID;
  const secret = process.env.HH_CLIENT_SECRET;
  if (!id || !secret) return null;
  try {
    const res = await fetch("https://api.hh.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "HH-User-Agent": process.env.HH_USER_AGENT ?? "Trajectory/0.3" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token: string; expires_in?: number };
    tokenCache = { token: j.access_token, until: Date.now() + ((j.expires_in ?? 14 * 86400) - 600) * 1000 };
    return j.access_token;
  } catch {
    return null;
  }
}

/** Стажировки на hh.ru: без опыта, по словам «стажёр / стажировка / студент», с фильтром по региону и запросу специальности. */
export async function fetchInternships(query: string | null, area: number | null): Promise<HhVacancy[] | null> {
  const key = `hh-intern:${query ?? ""}:${area ?? "rf"}`;
  const cached = cacheGet<HhVacancy[]>(key, 6 * 3600_000);
  if (cached) return cached;
  const ua = process.env.HH_USER_AGENT;
  const token = await appToken();
  if (!ua || !token) return null;
  const words = "(стажер OR стажёр OR стажировка OR студент)";
  const params = new URLSearchParams({ text: query ? `${words} AND (${query})` : words, experience: "noExperience", per_page: "20", order_by: "publication_time" });
  if (area) params.set("area", String(area));
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://api.hh.ru/vacancies?${params}`, { headers: { "HH-User-Agent": ua, Authorization: `Bearer ${token}` }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { items: { id: string; name: string; alternate_url: string; published_at: string; area: { name: string }; employer: { name: string }; salary: { from: number | null; to: number | null; currency: string } | null }[] };
    const out = json.items.map((v) => ({
      id: v.id, name: v.name, employer: v.employer?.name ?? "", area: v.area?.name ?? "", url: v.alternate_url, publishedAt: v.published_at,
      salary: v.salary && v.salary.currency === "RUR" ? [v.salary.from, v.salary.to].filter(Boolean).map((x) => `${Math.round(x! / 1000)} тыс.`).join("–") : null,
    }));
    cacheSet(key, out);
    return out;
  } catch {
    return null;
  }
}
