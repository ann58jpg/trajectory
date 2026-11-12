"use client";
import { useEffect, useMemo } from "react";
import { admissionYear, useAdmission, useHistory, usePlan, useProfile, useSettings } from "@/lib/storage";
import { buildPlan, type PathId } from "@/lib/admission";

/** Всё, что нужно «Маршруту», плану и кабинету: ответы теста, избранное, шаги плана, настройки. */
export function useRouteInput() {
  const [profile, , r1] = useProfile();
  const [history, , r2] = useHistory();
  const [plan, setPlan, r3] = usePlan();
  const [admission, setAdmission, r4] = useAdmission();
  const [settings, setSettings, r5] = useSettings();
  const year = admissionYear(settings, profile.grade);
  const steps = useMemo(() => buildPlan(year, profile, admission.paths as PathId[]), [year, profile, admission.paths]);
  return {
    ready: r1 && r2 && r3 && r4 && r5,
    input: { profile, history, plan, admission, steps, settings },
    year, steps, profile, plan, setPlan, admission, setAdmission, settings, setSettings,
  };
}

/** Отметить, что глава открыта (статус «в процессе»). */
export function useMarkChapter(n: number) {
  const [settings, setSettings, ready] = useSettings();
  useEffect(() => {
    if (ready && !settings.visited.includes(`ch${n}`)) setSettings((s) => ({ ...s, visited: [...s.visited, `ch${n}`] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}
