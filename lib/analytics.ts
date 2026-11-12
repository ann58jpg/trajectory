"use client";
import { KEYS } from "@/lib/client/storage";

/**
 * Обезличенная аналитика воронки: Яндекс Метрика (reachGoal) + POST /api/track.
 * Никаких личных данных: только анонимный id сессии, название события и короткие параметры.
 */
export { TRACK_EVENTS, type TrackEvent } from "@/lib/track-events";
import type { TrackEvent } from "@/lib/track-events";
type Props = Record<string, string | number | boolean | null>;

declare global {
  interface Window { ym?: (id: number, action: string, goal: string, params?: Props) => void }
}

function sessionId(): string {
  try {
    let id = window.localStorage.getItem(KEYS.session);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEYS.session, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

export function track(event: TrackEvent, props: Props = {}) {
  if (typeof window === "undefined") return;
  const ymId = Number(process.env.NEXT_PUBLIC_YM_ID);
  try {
    if (ymId && window.ym) window.ym(ymId, "reachGoal", event, props);
  } catch {
    /* Метрика заблокирована — не мешаем интерфейсу */
  }
  const body = JSON.stringify({ event, props, sessionId: sessionId(), path: window.location.pathname });
  try {
    // keepalive — запрос доходит, даже если человек уже уходит со страницы
    void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* офлайн — событие теряется, это нормально */
  }
}
