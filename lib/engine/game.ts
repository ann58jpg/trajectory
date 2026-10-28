import taskCards from "@/data/task_cards.json";
import type { GameRound, Klimov } from "@/lib/schemas";

/** Игра «Что бы ты делал(а) завтра на работе?»: раунды из 2–3 карточек-задач, профессия открывается после выбора. */
export type GameCard = {
  id: string; text: string; professionId: string; professionName: string; group: string; sphere: string; tags: string[]; klimov: Klimov[];
};
export type Sphere = { id: string; name: string; groups: string[] };

export const CARDS = taskCards.cards as GameCard[];
export const SPHERES = taskCards.spheres as Sphere[];
export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
export const GAME_ROUNDS = 12;
/** Первые 5 раундов — по одной карточке из каждой сферы (11 сфер), контрастные пары. */
const OPENING: string[][] = [
  ["it", "art", "med"],
  ["eng", "people"],
  ["nature", "biz"],
  ["law", "words"],
  ["science", "transport"],
];
export const OPENING_ROUNDS = OPENING.length;

/** Очки сфер по ответам: выбрал +2, «обе/все» +1 каждой, «ничего» −0.5 каждой. */
export function sphereScores(rounds: GameRound[]): Map<string, number> {
  const s = new Map<string, number>(SPHERES.map((x) => [x.id, 0]));
  for (const r of rounds) {
    if (!r.pick) continue;
    for (const id of r.cards) {
      const c = CARD_BY_ID.get(id);
      if (!c) continue;
      const d = r.pick === id ? 2 : r.pick === "all" ? 1 : r.pick === "none" ? -0.5 : 0;
      s.set(c.sphere, (s.get(c.sphere) ?? 0) + d);
    }
  }
  return s;
}

// Детерминированный выбор, чтобы раунды не менялись после перезагрузки страницы
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pickFromSphere(sphere: string, shown: Set<string>, shownGroups: Map<string, number>, salt: string): GameCard | null {
  const pool = CARDS.filter((c) => c.sphere === sphere && !shown.has(c.id));
  if (!pool.length) return null;
  // сначала группы, которые ещё не показывали, внутри — псевдослучайно
  return pool.slice().sort((a, b) => (shownGroups.get(a.group) ?? 0) - (shownGroups.get(b.group) ?? 0) || hash(salt + a.id) - hash(salt + b.id))[0];
}

/** Карточки для следующего раунда по уже сыгранным раундам. */
export function nextRoundCards(rounds: GameRound[]): string[] {
  const n = rounds.length;
  const shown = new Set(rounds.flatMap((r) => r.cards));
  const shownGroups = new Map<string, number>();
  for (const id of shown) {
    const g = CARD_BY_ID.get(id)?.group;
    if (g) shownGroups.set(g, (shownGroups.get(g) ?? 0) + 1);
  }
  const salt = `r${n}:` + rounds.map((r) => r.pick ?? "").join(",");
  let spheres: string[];
  if (n < OPENING.length) spheres = OPENING[n];
  else {
    const scores = [...sphereScores(rounds).entries()].sort((a, b) => b[1] - a[1]);
    const liked = scores.filter(([, v]) => v > 0).map(([k]) => k);
    if (liked.length === 0) {
      // ничего не нравится — показываем то, что видели реже всего
      const seen = (sp: string) => CARDS.filter((c) => c.sphere === sp && shown.has(c.id)).length;
      spheres = SPHERES.map((x) => x.id).sort((a, b) => seen(a) - seen(b) || hash(salt + a) - hash(salt + b)).slice(0, 2);
    } else if (liked.length === 1) {
      spheres = [liked[0], liked[0]];
    } else {
      // чередуем пары из трёх лучших сфер, чтобы уточнить, что ближе
      const top = liked.slice(0, 3);
      const k = (n - OPENING.length) % 3;
      spheres = k === 0 ? [top[0], top[1]] : k === 1 ? [top[0], top[2] ?? top[1]] : [top[1], top[2] ?? top[0]];
    }
    // каждый третий адаптивный раунд — плюс одна «разведочная» карточка из сферы, где мало ответов
    if ((n - OPENING.length) % 3 === 2) {
      const explore = scores.slice().reverse().find(([k, v]) => v === 0 && !spheres.includes(k));
      if (explore) spheres = [...spheres, explore[0]];
    }
  }
  const out: string[] = [];
  for (const sp of spheres) {
    const c = pickFromSphere(sp, new Set([...shown, ...out]), shownGroups, salt + sp + out.length);
    if (c) {
      out.push(c.id);
      shownGroups.set(c.group, (shownGroups.get(c.group) ?? 0) + 1);
    }
  }
  // запасной вариант: если в сфере кончились карточки
  while (out.length < 2) {
    const c = CARDS.find((x) => !shown.has(x.id) && !out.includes(x.id));
    if (!c) break;
    out.push(c.id);
  }
  return out;
}

/** Выбранные карточки с весом: одна выбранная — 1, «обе/все интересны» — 0.6 каждой. */
export function gamePicks(rounds: GameRound[]): { card: GameCard; weight: number }[] {
  const out: { card: GameCard; weight: number }[] = [];
  for (const r of rounds) {
    if (!r.pick || r.pick === "none") continue;
    const ids = r.pick === "all" ? r.cards : [r.pick];
    for (const id of ids) {
      const card = CARD_BY_ID.get(id);
      if (card) out.push({ card, weight: r.pick === "all" ? 0.6 : 1 });
    }
  }
  return out;
}

/** Сводка в конце игры: любимые сферы и задачи. */
export function gameSummary(rounds: GameRound[]): { spheres: string[]; tasks: { text: string; profession: string }[] } {
  const scores = [...sphereScores(rounds).entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const name = new Map(SPHERES.map((s) => [s.id, s.name]));
  const tasks = gamePicks(rounds).filter((x) => x.weight === 1).map((x) => ({ text: x.card.text, profession: x.card.professionName }));
  return { spheres: scores.slice(0, 3).map(([k]) => name.get(k)!), tasks: tasks.slice(-4) };
}

/** Прогон игры за персону (для тестов и демо-профилей): likes решает, нравится ли карточка. */
export function simulateGame(likes: (c: GameCard) => boolean): GameRound[] {
  const rounds: GameRound[] = [];
  for (let i = 0; i < GAME_ROUNDS; i++) {
    const cards = nextRoundCards(rounds);
    if (!cards.length) break;
    const liked = cards.filter((id) => likes(CARD_BY_ID.get(id)!));
    rounds.push({ cards, pick: liked.length === 0 ? "none" : liked.length === cards.length && cards.length > 1 ? "all" : liked[0] });
  }
  return rounds;
}
