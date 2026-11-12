import type { Admission, HistoryItem, Plan, Settings } from "@/lib/storage";
import type { StudentProfile } from "@/lib/schemas";
import type { PlanStep } from "@/lib/admission";
import { ROUTE } from "@/lib/copy";

export type ChapterStatus = "todo" | "progress" | "done";
export type Chapter = { n: number; href: string; status: ChapterStatus; progress: number };

export const CHAPTER_HREF = ["/quiz", "/results", "/plan", "/life", "/career"] as const;

/** Статусы пяти глав «Маршрута» по тому, что сохранено в браузере. */
export function chapters(input: { profile: StudentProfile; history: HistoryItem[]; plan: Plan; admission: Admission; steps: PlanStep[]; settings: Settings }): Chapter[] {
  const { profile, history, plan, admission, steps, settings } = input;
  const seen = (n: number) => settings.visited.includes(`ch${n}`);
  const quizDone = history.length > 0;
  const unis = plan.universities.length + new Set(plan.programs.map((p) => p.split("__")[0])).size;
  const picked = unis + plan.specialties.length + plan.professions.length;
  const doneSteps = steps.filter((s) => admission.done.includes(s.id)).length;
  const lifeSaved = plan.events.length;
  return [
    { n: 1, href: CHAPTER_HREF[0], status: quizDone ? "done" : profile.consent ? "progress" : "todo", progress: quizDone ? 1 : profile.consent ? 0.5 : 0 },
    { n: 2, href: CHAPTER_HREF[1], status: unis >= 3 ? "done" : picked > 0 || seen(2) ? "progress" : "todo", progress: Math.min(1, picked / 3) },
    { n: 3, href: CHAPTER_HREF[2], status: steps.length && doneSteps === steps.length ? "done" : doneSteps > 0 || seen(3) ? "progress" : "todo", progress: steps.length ? doneSteps / steps.length : 0 },
    { n: 4, href: CHAPTER_HREF[3], status: lifeSaved > 0 ? "done" : seen(4) ? "progress" : "todo", progress: lifeSaved > 0 ? 1 : seen(4) ? 0.5 : 0 },
    { n: 5, href: CHAPTER_HREF[4], status: plan.internships.length > 0 ? "done" : seen(5) ? "progress" : "todo", progress: plan.internships.length > 0 ? 1 : seen(5) ? 0.5 : 0 },
  ];
}

/** «Твой следующий шаг»: одна кнопка. Тест → выбор вузов → ближайший неотмеченный шаг плана → жизнь → карьера. */
export function nextStep(input: Parameters<typeof chapters>[0], now = new Date()): { title: string; text: string; cta: string; href: string } {
  const ch = chapters(input);
  if (ch[0].status !== "done") return { ...(input.profile.consent ? ROUTE.next.testContinue : ROUTE.next.test), href: "/quiz" };
  if (ch[1].status === "todo") return { ...ROUTE.next.pick, href: "/results" };
  const today = now.toISOString().slice(0, 10);
  const step = input.steps.find((s) => !input.admission.done.includes(s.id) && s.date >= today) ?? input.steps.find((s) => !input.admission.done.includes(s.id));
  if (step) return { ...ROUTE.next.plan(step.title), href: step.href && step.href.startsWith("/") ? step.href : `/plan#${step.id}` };
  if (ch[3].status !== "done") return { ...ROUTE.next.life, href: "/life" };
  return { ...ROUTE.next.career, href: "/career" };
}

/** Готовность к поступлению для кабинета: тест, выбор, шаги плана. */
export function readiness(input: Parameters<typeof chapters>[0]): number {
  const ch = chapters(input);
  return Math.round((ch[0].progress * 0.25 + ch[1].progress * 0.25 + ch[2].progress * 0.5) * 100);
}
