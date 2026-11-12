"use client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { StudentProfile, emptyProfile } from "@/lib/schemas";
import { WEIGHT_ANCHORS } from "@/lib/engine/config";

/**
 * Слой хранения. Пока аккаунтов нет, всё лежит в браузере (localStorage, каждый доступ — в try/catch).
 * Страницы работают только через хуки этого модуля, поэтому настоящие аккаунты можно подключить здесь,
 * не трогая страницы: заменить readLS/writeLS на запросы к серверу.
 */
export const KEYS = {
  profile: "trajectory.profile.v1",
  step: "trajectory.quizStep.v1",
  plan: "trajectory.plan.v1",
  weights: "trajectory.weights.v1",
  slider: "trajectory.slider.v1",
  theme: "trajectory.theme",
  compare: "trajectory.compare.v1",
  mode: "trajectory.mode.v1",
  presentation: "trajectory.presentation.v1",
  session: "trajectory.session.v1",
  settings: "trajectory.settings.v1",
  admission: "trajectory.admission.v1",
  history: "trajectory.history.v1",
  device: "trajectory.device.v1",
  demoVibe: "trajectory.demoVibe.v1",
  vibeWeight: "trajectory.vibeWeight.v1",
  onboarding: "trajectory.onboarding.v1",
} as const;

export function readLS<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

const LOCAL_EVENT = "trajectory:storage";

export function writeLS(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // другие компоненты в этой же вкладке (событие storage приходит только из других вкладок)
    // после текущего рендера: writeLS вызывается и из апдейтера setState
    queueMicrotask(() => window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: key })));
  } catch {
    /* приватный режим / квота — работаем без сохранения */
  }
}

export function removeLS(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Состояние, синхронизированное с localStorage; ready=false до чтения (без рассинхрона гидрации). */
export function useStored<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, initial: () => T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setValue(readLS(key, schema, initial()));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(readLS(key, schema, initial()));
    };
    const onLocal = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) setValue(readLS(key, schema, initial()));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        writeLS(key, v);
        return v;
      });
    },
    [key],
  );
  return [value, update, ready] as const;
}

export const useProfile = () => useStored(KEYS.profile, StudentProfile, emptyProfile);

/** Избранное (исторически — «Мой план»). Ключ прежний, чтобы сохранённое не потерялось. */
export const PlanSchema = z.object({
  professions: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  universities: z.array(z.string()).default([]),
  programs: z.array(z.string()).default([]),
  internships: z.array(z.string()).default([]),
  /** Заметки к вузам: «на ДОД понравилась лаборатория». */
  notes: z.record(z.string(), z.string().max(500)).default({}),
  events: z
    .array(z.object({ id: z.string(), title: z.string(), url: z.string(), date: z.string().nullable(), universityId: z.string(), done: z.boolean().default(false) }))
    .default([]),
});
export type Plan = z.infer<typeof PlanSchema>;
export const emptyPlan = (): Plan => PlanSchema.parse({});
export const usePlan = () => useStored(KEYS.plan, PlanSchema, emptyPlan);

const W = z.object({ demand: z.number(), income: z.number(), employment: z.number(), priority: z.number(), match: z.number() });
export const AnchorsSchema = z.object({ interests: W, base: W, money: W });
export const useWeights = () => useStored(KEYS.weights, AnchorsSchema, () => WEIGHT_ANCHORS);

export const CompareItem = z.object({ kind: z.enum(["profession", "specialty", "university"]), id: z.string() });
export type CompareItem = z.infer<typeof CompareItem>;
export const useCompare = () => useStored(KEYS.compare, z.array(CompareItem), () => [] as CompareItem[]);

/** «Режим презентации» (/admin): оценки скрыты, вместо них — рамка «Подтверждённых данных нет». */
export const usePresentation = () => useStored(KEYS.presentation, z.boolean(), () => false);

/* ───────── Настройки верхней панели ───────── */

export const SettingsSchema = z.object({
  level: z.enum(["vo", "spo", "mag"]).default("vo"),
  /** null — подставить по классу из теста. */
  year: z.union([z.literal(2027), z.literal(2028)]).nullable().default(null),
  /** Какие главы «Маршрута» открывал (для статуса «в процессе»). */
  visited: z.array(z.string()).default([]),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const useSettings = () => useStored(KEYS.settings, SettingsSchema, () => SettingsSchema.parse({}));

/** Год поступления: из верхней панели, иначе по классу (11 класс и выпускники — ближайший приём). */
export function admissionYear(settings: Settings, grade: StudentProfile["grade"], now = new Date()): 2027 | 2028 {
  if (settings.year) return settings.year;
  // приём ближайшего лета: до сентября — этот год+1 уже не ближайший
  const base = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const y = grade === "10" ? base + 1 : grade === "9" ? base + 2 : base;
  return y >= 2028 ? 2028 : 2027;
}

/* ───────── План поступления: отмеченные шаги и пути ───────── */

export const AdmissionSchema = z.object({
  done: z.array(z.string()).default([]),
  paths: z.array(z.enum(["general", "special", "separate", "target", "olympiad", "paid"])).default([]),
});
export type Admission = z.infer<typeof AdmissionSchema>;
export const useAdmission = () => useStored(KEYS.admission, AdmissionSchema, () => AdmissionSchema.parse({}));

/* ───────── История прохождений теста ───────── */

export const HistoryItem = z.object({
  at: z.string(),
  vibeType: z.string().nullable().default(null),
  spheres: z.array(z.string()).default([]),
  portrait: z.string().default(""),
});
export type HistoryItem = z.infer<typeof HistoryItem>;
export const useHistory = () => useStored(KEYS.history, z.array(HistoryItem).max(20), () => [] as HistoryItem[]);

/** ID устройства для теста вайба: «одно устройство — один ответ на вуз». Не личные данные. */
export function deviceId(): string {
  try {
    let id = window.localStorage.getItem(KEYS.device);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEYS.device, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

/** Сколько всего сохранено — счётчик у иконки профиля. */
export function savedCount(p: Plan): number {
  return p.professions.length + p.specialties.length + p.universities.length + p.programs.length + p.events.length + p.internships.length;
}
