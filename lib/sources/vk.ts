import "server-only";
import { cacheGet, cacheSet } from "@/lib/db/cache";

export type VkPost = { id: string; date: string; text: string; url: string };

const TTL = 6 * 3600_000;
const EVENT_WORDS = /(день открытых дверей|фестивал|посвящени|концерт|форум|хакатон|конференц|турнир|чемпионат|бал|кубок|олимпиад|вечеринк|квиз|мастер-класс|встреча)/i;

/**
 * Посты сообщества ВКонтакте про события (wall.get). Нужен сервисный ключ VK_SERVICE_TOKEN
 * (vk.com/apps?act=manage → приложение → «Сервисный ключ доступа»). Без ключа или при ошибке — null,
 * и страница берёт данные из data/student_life.json.
 */
export async function fetchVkEvents(domain: string, limit = 5): Promise<VkPost[] | null> {
  const token = process.env.VK_SERVICE_TOKEN;
  if (!token) return null;
  const key = `vk:${domain}`;
  const cached = cacheGet<VkPost[]>(key, TTL);
  if (cached) return cached;
  const params = new URLSearchParams({ domain, count: "50", access_token: token, v: "5.199" });
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://api.vk.com/method/wall.get?${params}`, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: { items: { id: number; owner_id: number; date: number; text: string }[] } };
    if (!json.response) return null;
    const posts = json.response.items
      .filter((p) => EVENT_WORDS.test(p.text))
      .slice(0, limit)
      .map((p) => ({ id: `${p.owner_id}_${p.id}`, date: new Date(p.date * 1000).toISOString(), text: p.text.split("\n")[0].slice(0, 200), url: `https://vk.com/wall${p.owner_id}_${p.id}` }));
    cacheSet(key, posts);
    return posts;
  } catch {
    return null;
  }
}

/** Короткое имя сообщества из ссылки vk.com/<domain>. */
export const vkDomain = (url: string) => url.replace(/^https?:\/\/(m\.)?vk\.com\//, "").split(/[/?#]/)[0];
