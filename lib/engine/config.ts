import type { FactorKey } from "@/lib/schemas";

export type Weights = Record<FactorKey, number>;

/**
 * Веса скоринга. «Если государству нужно усилить отрасль — меняются веса»:
 * правьте здесь или на скрытой странице /admin/weights (переопределение хранится в браузере).
 * Ползунок t ∈ [0..1]: 0 — Интересы, 0.5 — базовая формула модели, 1 — Деньги (кусочно-линейно).
 */
export const WEIGHT_ANCHORS: { interests: Weights; base: Weights; money: Weights } = {
  interests: { match: 0.45, demand: 0.15, income: 0.1, employment: 0.15, priority: 0.15 },
  base: { demand: 0.3, income: 0.25, employment: 0.2, priority: 0.15, match: 0.1 },
  money: { income: 0.4, demand: 0.25, employment: 0.2, priority: 0.1, match: 0.05 },
};

export const ENGINE = {
  /** Порог минимальной совместимости в режиме «Деньги». */
  moneyMatchThreshold: 0.25,
  /** Минимальный выигрыш для карточки «Если готов изменить…». */
  tradeoffMinGain: 0.25,
  /** Бонусы горизонта денег (добавляются к итоговому скору). */
  horizon: {
    asap: { early1: 0.08, early2: 0.06, early3: 0.03, flexibleForm: 0.04, spo: 0.03, longPenalty: -0.06 },
    parttime: { early1: 0.04, early2: 0.03, early3: 0.015, flexibleForm: 0.02, spo: 0.0, longPenalty: -0.02 },
  },
  /** Удалённая работа: доля московского уровня зарплаты, доступная из любого города. */
  remoteSalaryCoef: 1.3,
  /** Насколько удалённая работа сокращает разрыв с крупным городом (0..1). */
  remoteConvergence: 0.55,
};

export const FACTOR_LABEL: Record<FactorKey, string> = {
  demand: "Спрос",
  income: "Доход",
  employment: "Трудоустройство",
  priority: "Приоритет и перспектива",
  match: "Совпадение с тобой",
};

const lerp = (a: Weights, b: Weights, k: number): Weights => ({
  demand: a.demand + (b.demand - a.demand) * k,
  income: a.income + (b.income - a.income) * k,
  employment: a.employment + (b.employment - a.employment) * k,
  priority: a.priority + (b.priority - a.priority) * k,
  match: a.match + (b.match - a.match) * k,
});

export function weightsAt(t: number, anchors = WEIGHT_ANCHORS): Weights {
  const x = Math.min(1, Math.max(0, t));
  return x <= 0.5 ? lerp(anchors.interests, anchors.base, x * 2) : lerp(anchors.base, anchors.money, x * 2 - 1);
}
