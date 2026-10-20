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
