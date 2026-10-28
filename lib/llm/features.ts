import "server-only";
import crypto from "node:crypto";
import { AiEvents, DreamParse, Explanation, type UniEvent, type University } from "@/lib/schemas";
import { cacheGet, cacheSet } from "@/lib/db/cache";
import { parseDreamKeywords } from "@/lib/engine/profile";
import { getProvider, withRetry } from "./index";
import { EVENTS_SYSTEM, EXPLAIN_SYSTEM, PARSE_DREAM_SYSTEM, explainUser } from "./prompts";

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 24);
const ALLOWED_TAGS = new Set("it data math security engineering electronics robotics drones aviation space energy nuclear oil_gas chemistry biology bio medicine animals nature ecology agro geology construction machine manufacturing auto transport design art media writing languages intl politics history law social psychology people education business finance management logistics tourism food fashion sport games science".split(" "));

/** 1. Разбор свободного текста (вопрос 17). Без ИИ — ключевые слова с синонимами. */
export async function parseDream(text: string): Promise<{ result: DreamParse; source: "ai" | "keywords" }> {
  const fallback = () => {
    const k = parseDreamKeywords(text);
    return { result: { tags: k.tags.slice(0, 12), values: k.values, fears: k.fears }, source: "keywords" as const };
  };
  if (text.trim().length < 5) return fallback();
  const provider = getProvider();
  if (provider.id === "none") return fallback();
  const key = `dream:${hash(text)}`;
  const cached = cacheGet<DreamParse>(key, 7 * 24 * 3600_000);
  if (cached) return { result: cached, source: "ai" };
  try {
    const r = await withRetry(() => provider.completeJSON({ system: PARSE_DREAM_SYSTEM, user: text.slice(0, 2000), schema: DreamParse, maxTokens: 1500 }));
    const clean = { ...r, tags: r.tags.filter((t) => ALLOWED_TAGS.has(t)) };
    cacheSet(key, clean);
    return { result: clean, source: "ai" };
  } catch (e) {
    console.warn("[llm] parseDream → фолбэк:", (e as Error).message);
    return fallback();
  }
}

/** 2. Персональные объяснения. На вход — профиль и факты из БД; числа ИИ не придумывает. */
export async function explain(
  profileSummary: string, facts: Record<string, unknown>, template: () => Explanation,
): Promise<{ result: Explanation; source: "ai" | "template" }> {
  const provider = getProvider();
  if (provider.id === "none") return { result: template(), source: "template" };
  const key = `explain:${hash(profileSummary + JSON.stringify(facts))}`;
  const cached = cacheGet<Explanation>(key, 24 * 3600_000);
  if (cached) return { result: cached, source: "ai" };
  try {
    const r = await withRetry(() =>
      provider.completeJSON({ system: EXPLAIN_SYSTEM, user: explainUser(profileSummary, facts), schema: Explanation, maxTokens: 2500 }),
    );
    cacheSet(key, r);
    return { result: r, source: "ai" };
  } catch (e) {
    console.warn("[llm] explain → шаблон:", (e as Error).message);
    return { result: template(), source: "template" };
  }
}

/** 3. Свежие мероприятия вуза через web search. Кэш 12 ч. Фолбэк — seed и страница событий вуза. */
export async function findEvents(uni: University, seed: UniEvent[]): Promise<{ events: UniEvent[]; source: "ai" | "seed" }> {
  const provider = getProvider();
  if (provider.id === "none" || !provider.supportsWebSearch) return { events: seed, source: "seed" };
  const today = new Date();
  const until = new Date(today.getTime() + 60 * 24 * 3600_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const key = `events:${uni.id}:${iso(today)}`;
  const cached = cacheGet<UniEvent[]>(key, 12 * 3600_000);
  if (cached) return { events: cached.length ? cached : seed, source: cached.length ? "ai" : "seed" };
  try {
    const host = new URL(uni.site).hostname.replace(/^www\./, "");
    const r = await withRetry(() =>
      provider.completeJSON({
        system: EVENTS_SYSTEM(iso(today), iso(until)),
        user: `Вуз: ${uni.name} (${uni.short}), город ${uni.city}. Официальный сайт: ${uni.site} (домен ${host}). Страница для абитуриентов: ${uni.admissionUrl}. Найди события на ближайшие 60 дней.`,
        schema: AiEvents,
        webSearch: { maxUses: 5 },
        maxTokens: 6000,
        timeoutMs: 45_000,
      }),
    );
    // отбрасываем прошедшие, слишком далёкие и без ссылки
    const events: UniEvent[] = r.events
      .filter((e) => e.date >= iso(today) && e.date <= iso(until) && /^https?:\/\//.test(e.url))
      .map((e, i) => ({ id: `${uni.id}__ai${i}`, universityId: uni.id, title: e.title, type: e.type, format: e.format, date: e.date, time: e.time || null, when: e.date, url: e.url, why: e.why, source: "ai" as const }))
      .sort((a, b) => (a.date! < b.date! ? -1 : 1));
    cacheSet(key, events);
    return events.length ? { events, source: "ai" } : { events: seed, source: "seed" };
  } catch (e) {
    console.warn("[llm] findEvents → seed:", (e as Error).message);
    return { events: seed, source: "seed" };
  }
}
