import type { Rec } from "@/lib/schemas";

/** Направление в выдаче: лучшие профессии, к которым оно ведёт (без повторов между направлениями). */
export type Direction<R extends Rec = Rec & { score: number }> = {
  code: string;
  group: string;
  score: number;
  recs: R[];
};

/**
 * Топ направлений из отсортированных профессий:
 * — профессия показывается один раз — в лучшем направлении, где для неё есть программы;
 * — в топе не больше perGroup направлений одной группы, остальные из той же группы уходят в «Показать похожие».
 */
export function buildDirections<R extends Rec & { score: number }>(
  ranked: R[],
  hasPrograms: (code: string) => boolean,
  opts: { limit?: number; perGroup?: number; perDirection?: number; pool?: number; likedGroups?: Record<string, number> } = {},
): { top: Direction<R>[]; similar: Record<string, Direction<R>[]> } {
  const { limit = 5, perGroup = 2, perDirection = 3, pool = 40, likedGroups = {} } = opts;
  const byCode = new Map<string, Direction<R>>();
  for (const r of ranked.slice(0, pool)) {
    const codes = r.specialtyCodes.filter((c) => hasPrograms(c) || r.programs.some((p) => p.specialtyCode === c));
    codes.forEach((c, idx) => {
      const d = byCode.get(c) ?? { code: c, group: c.slice(0, 2), score: 0, recs: [] };
      // группы, чьи задачи понравились в игре, выше; главное направление профессии — выше запасных
      d.score = Math.max(d.score, r.score + 0.1 * (likedGroups[d.group] ?? 0) - 0.015 * idx);
      d.recs.push(r);
      byCode.set(c, d);
    });
  }
  const sorted = [...byCode.values()].sort((a, b) => b.score - a.score || b.recs.length - a.recs.length);
  const shown = new Set<string>();
  const perGroupCount = new Map<string, number>();
  const top: Direction<R>[] = [];
  const rest: Direction<R>[] = [];
  for (const d of sorted) {
    const fresh = d.recs.filter((r) => !shown.has(r.professionId)).slice(0, perDirection);
    if (top.length < limit && (perGroupCount.get(d.group) ?? 0) < perGroup && fresh.length > 0) {
      fresh.forEach((r) => shown.add(r.professionId));
      perGroupCount.set(d.group, (perGroupCount.get(d.group) ?? 0) + 1);
      top.push({ ...d, recs: fresh });
    } else rest.push(d);
  }
  // «Показать похожие»: другие направления тех же групп, что в топе
  const similar: Record<string, Direction<R>[]> = {};
  for (const d of top) {
    similar[d.code] = rest.filter((x) => x.group === d.group).slice(0, 4).map((x) => ({ ...x, recs: x.recs.slice(0, perDirection) }));
  }
  // похожие показываем один раз — у первого направления группы
  const seenGroup = new Set<string>();
  for (const d of top) {
    if (seenGroup.has(d.group)) similar[d.code] = [];
    seenGroup.add(d.group);
  }
  return { top, similar };
}
