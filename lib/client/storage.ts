"use client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { StudentProfile, emptyProfile } from "@/lib/schemas";
import { WEIGHT_ANCHORS } from "@/lib/engine/config";

/** Всё хранится только в браузере (152-ФЗ). Любой доступ к localStorage — в try/catch. */
export const KEYS = {
  profile: "trajectory.profile.v1",
  step: "trajectory.quizStep.v1",
  plan: "trajectory.plan.v1",
  weights: "trajectory.weights.v1",
  slider: "trajectory.slider.v1",
  theme: "trajectory.theme",
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

export function writeLS(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
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
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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

export const PlanSchema = z.object({
  professions: z.array(z.string()).default([]),
  universities: z.array(z.string()).default([]),
  programs: z.array(z.string()).default([]),
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
