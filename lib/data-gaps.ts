import type { Catalog } from "@/lib/data/validate";

/** Владельцы данных, у которых есть подтверждённые цифры. */
export const OWNERS = {
  sfr: { name: "СФР", need: "Зарплаты выпускников по направлениям и вузам через 1, 3 и 5 лет (по страховым взносам), обезличенно." },
  fns: { name: "ФНС", need: "Доходы выпускников по НДФЛ в разрезе регионов и отраслей — чтобы проверить наши оценки зарплат." },
  unis: { name: "Вузы", need: "Проходные баллы по приказам о зачислении, число бюджетных мест, цены, даты дней открытых дверей в открытом формате." },
  hh: { name: "hh.ru", need: "Доступ к API со статистикой вакансий и зарплат по профессиям и регионам." },
  minobr: { name: "Минобрнауки", need: "Контрольные цифры приёма (бюджетные места) по вузам и мониторинг трудоустройства выпускников в открытом формате." },
  mintrud: { name: "Минтруд", need: "Прогноз кадровой потребности по профессиям и регионам на 5–7 лет." },
} as const;
export type OwnerId = keyof typeof OWNERS;

export type Gap = { id: string; what: string; where: string; owners: OwnerId[]; count: number; total: number };

/** Сводка пробелов по каталогу: сколько цифр без подтверждения. */
export function computeGaps(c: Catalog): Gap[] {
  const ru = c.universities.filter((u) => !u.abroad);
  const ruIds = new Set(ru.map((u) => u.id));
  const progs = c.programs.filter((p) => ruIds.has(p.universityId));
  const est = (x: { confidence: string }) => x.confidence !== "verified";
  return [
    {
      id: "pass", what: "Проходные баллы на бюджет", where: "приказы о зачислении на сайтах вузов, tabiturient.ru/vuzege, «Поступи онлайн»", owners: ["unis", "minobr"],
      count: progs.filter((p) => p.passScore.official.length === 0).length, total: progs.length,
    },
    {
      id: "budget", what: "Число бюджетных мест", where: "контрольные цифры приёма (Минобрнауки), правила приёма вузов", owners: ["minobr", "unis"],
      count: progs.filter((p) => p.budgetPlaces === null || est(p.meta)).length, total: progs.length,
    },
    {
      id: "salary", what: "Зарплаты выпускников через 1–5 лет", where: "данные СФР и ФНС по выпускникам, статистика hh.ru", owners: ["sfr", "fns", "hh"],
      count: c.professions.filter((p) => est(p.salary.meta)).length, total: c.professions.length,
    },
    {
      id: "demand", what: "Число вакансий и рост спроса", where: "API hh.ru, «Работа России»", owners: ["hh", "mintrud"],
      count: c.professions.filter((p) => est(p.demand.meta)).length, total: c.professions.length,
    },
    {
      id: "employment", what: "Доля выпускников, нашедших работу", where: "мониторинг трудоустройства Минобрнауки, данные СФР", owners: ["minobr", "sfr"],
      count: c.specialties.filter((s) => est(s.employment.meta)).length, total: c.specialties.length,
    },
    {
      id: "outlook", what: "Прогноз: будет ли профессия нужна через 5–7 лет", where: "прогноз кадровой потребности Минтруда", owners: ["mintrud"],
      count: c.professions.length, total: c.professions.length,
    },
    {
      id: "price", what: "Стоимость обучения", where: "приказы о стоимости на сайтах вузов", owners: ["unis"],
      count: ru.filter((u) => est(u.priceMeta)).length, total: ru.length,
    },
    {
      id: "events", what: "Даты дней открытых дверей и мероприятий", where: "сайты и соцсети вузов, tabiturient.ru/dod", owners: ["unis"],
      count: c.events.filter((e) => e.date === null).length, total: c.events.length,
    },
  ];
}
