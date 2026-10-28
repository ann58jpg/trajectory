/** Мини-грамматика для шаблонных текстов демо-режима. */

const SPECIAL_GENITIVE: Record<string, string> = {
  "Нижний Новгород": "Нижнего Новгорода",
  "Ростов-на-Дону": "Ростова-на-Дону",
  "Набережные Челны": "Набережных Челнов",
  "Нижний Тагил": "Нижнего Тагила",
  "Южно-Сахалинск": "Южно-Сахалинска",
  "Ханты-Мансийск": "Ханты-Мансийска",
  "Каменск-Уральский": "Каменска-Уральского",
  "Большой Камень": "Большого Камня",
};

export function genitiveCity(name: string): string {
  if (SPECIAL_GENITIVE[name]) return SPECIAL_GENITIVE[name];
  if (/\(/.test(name)) return name;
  if (/[иоеуюэ]$/i.test(name)) return name;
  if (/ь$/.test(name)) return name.slice(0, -1) + "и";
  if (/[кгхжшчщ]а$/.test(name)) return name.slice(0, -1) + "и";
  if (/а$/.test(name)) return name.slice(0, -1) + "ы";
  if (/я$/.test(name)) return name.slice(0, -1) + "и";
  if (/й$/.test(name)) return name.slice(0, -1) + "я";
  return name + "а";
}

/** «переехать в …» */
export function accusativeCity(name: string): string {
  if (name === "Нижний Новгород" || name === "Ростов-на-Дону" || /\(/.test(name)) return name;
  if (name === "Набережные Челны") return "Набережные Челны";
  if (/а$/.test(name)) return name.slice(0, -1) + "у";
  if (/я$/.test(name)) return name.slice(0, -1) + "ю";
  return name;
}

/** «в …» (предложный) */
export function prepositionalCity(name: string): string {
  if (name === "Нижний Новгород") return "Нижнем Новгороде";
  if (name === "Ростов-на-Дону") return "Ростове-на-Дону";
  if (/\(/.test(name)) return name;
  if (/[иоеуюэ]$/i.test(name)) return name;
  if (/ь$/.test(name)) return name.slice(0, -1) + "и";
  if (/[ая]$/.test(name)) return name.slice(0, -1) + "е";
  if (/й$/.test(name)) return name.slice(0, -1) + "е";
  return name + "е";
}

export const SUBJECT_ACC: Record<string, string> = {
  rus: "русский язык",
  math: "профильную математику",
  phys: "физику",
  chem: "химию",
  bio: "биологию",
  inf: "информатику",
  soc: "обществознание",
  hist: "историю",
  lit: "литературу",
  foreign: "иностранный язык",
  math_base: "базовую математику",
  geo: "географию",
};

export const SUBJECT_NOM: Record<string, string> = {
  rus: "русский язык",
  math: "профильная математика",
  phys: "физика",
  chem: "химия",
  bio: "биология",
  inf: "информатика",
  soc: "обществознание",
  hist: "история",
  lit: "литература",
  foreign: "иностранный язык",
  math_base: "базовая математика",
  geo: "география",
};

export function yearsWord(n: number): string {
  if (!Number.isInteger(n)) {
    const y = Math.floor(n);
    const mo = Math.round((n - y) * 12);
    return `${y} г. ${mo} мес.`;
  }
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} год`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} года`;
  return `${n} лет`;
}

export function pointsWord(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} балл`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} балла`;
  return `${n} баллов`;
}

export const rubles = (n: number) => `${(Math.round(n / 1000) * 1000).toLocaleString("ru-RU")} ₽`;

export const SUBJECT_SHORT: Record<string, string> = {
  rus: "Русский",
  math: "Математика (проф.)",
  math_base: "Математика (база)",
  phys: "Физика",
  chem: "Химия",
  bio: "Биология",
  inf: "Информатика",
  soc: "Обществознание",
  hist: "История",
  lit: "Литература",
  foreign: "Иностранный язык",
  geo: "География",
};
