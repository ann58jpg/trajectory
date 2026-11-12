import calendar from "@/data/admission_calendar.json";
import type { StudentProfile } from "@/lib/schemas";

/** Шаг плана поступления с датами для выбранного года. */
export type PlanStep = {
  id: string;
  title: string;
  from: string | null;
  date: string;
  time: string | null;
  isCritical: boolean;
  confirmed: boolean;
  source: string;
  text: string;
  details: string[];
  href: string | null;
  action: string | null;
  /** Подшаги из выбранных путей поступления (особая квота, целевое…). */
  sub: string[];
};
export type PathId = keyof typeof calendar.paths;
export const PATHS = Object.entries(calendar.paths).map(([id, p]) => ({ id: id as PathId, label: p.label }));
export const EARLY_START = calendar.earlyStart;
export const CALENDAR_SOURCES = calendar.meta.sources as Record<string, string>;

const shift = (d: string | null, years: number) => (d ? `${Number(d.slice(0, 4)) + years}${d.slice(4)}` : null);

/** Нужны ли шаги «медкомиссия» и «творческий экзамен» — по ответам теста. */
export function conditions(p: StudentProfile) {
  return {
    vuc_or_dept: p.vucImportant === "yes",
    creative: p.dviReady.some((d) => d === "art" || d === "stage" || d === "contest"),
  };
}

/**
 * 8–10 главных шагов. Даты 2028 — те же со сдвигом на год и пометкой «ожидаемая дата».
 * Выбранные пути поступления добавляют подшаги в существующие шаги, а не новые шаги.
 */
export function buildPlan(year: 2027 | 2028, p: StudentProfile, paths: PathId[]): PlanStep[] {
  const dy = year - 2027;
  const base = calendar.years["2027"];
  const cond = conditions(p);
  const steps: PlanStep[] = base.map((s) => ({
    id: s.id, title: s.title, from: shift(s.from, dy), date: shift(s.date, dy)!, time: "time" in s ? (s.time as string) : null,
    isCritical: s.isCritical, confirmed: dy === 0 && s.confirmed, source: s.source, text: s.text, details: s.details,
    href: s.href, action: s.action, sub: [],
  }));
  for (const c of calendar.conditional) {
    if (!cond[c.when as keyof typeof cond]) continue;
    const at = steps.findIndex((s) => s.id === c.after);
    steps.splice(at + 1, 0, {
      id: c.id, title: c.title, from: null, date: `${year}-${c.date}`, time: null, isCritical: c.isCritical, confirmed: false,
      source: c.source, text: c.text, details: c.details, href: c.href, action: c.action, sub: [],
    });
  }
  for (const id of paths) {
    const sub = calendar.paths[id]?.sub as Record<string, string> | undefined;
    for (const [stepId, text] of Object.entries(sub ?? {})) steps.find((s) => s.id === stepId)?.sub.push(text);
  }
  return steps.slice(0, 12);
}

/** До ближайшей критической даты, которая ещё не прошла и не отмечена. */
export function nextCritical(steps: PlanStep[], done: string[], now = new Date()): { step: PlanStep; days: number } | null {
  const today = now.toISOString().slice(0, 10);
  const next = steps.filter((s) => s.isCritical && !done.includes(s.id) && s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;
  const days = Math.ceil((new Date(`${next.date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 864e5);
  return { step: next, days };
}

/** Календарь .ics для Яндекс или Google Календаря: событие на день срока каждого шага. */
export function toIcs(items: { id: string; title: string; date: string; text?: string; url?: string | null }[], name: string): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const d = (x: string) => x.replace(/-/g, "");
  const next = (x: string) => {
    const t = new Date(`${x}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//trajectory//plan//RU", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(name)}`];
  for (const it of items) {
    lines.push("BEGIN:VEVENT", `UID:${it.id}-${d(it.date)}@trajectory`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d(it.date)}`, `DTEND;VALUE=DATE:${next(it.date)}`,
      `SUMMARY:${esc(it.title)}`, ...(it.text ? [`DESCRIPTION:${esc(it.text)}`] : []), ...(it.url ? [`URL:${it.url}`] : []), "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Скачать .ics в браузере. */
export function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
