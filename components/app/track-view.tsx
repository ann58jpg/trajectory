"use client";
import { useEffect } from "react";
import { track, type TrackEvent } from "@/lib/analytics";

/** Отправляет событие просмотра страницы один раз при открытии. */
export function TrackView({ event, props }: { event: TrackEvent; props?: Record<string, string | number | boolean | null> }) {
  useEffect(() => {
    track(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
