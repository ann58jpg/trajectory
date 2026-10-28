"use client";
/** Обезличенная аналитика воронки. Подробности — в пункте про конверсию (README). */
export type TrackEvent = string;
export function track(event: TrackEvent, props: Record<string, string | number | boolean | null> = {}) {
  void event;
  void props;
}
