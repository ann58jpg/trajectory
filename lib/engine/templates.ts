import type { Explanation, Profession, Rec, University } from "@/lib/schemas";

/** Тексты демо-режима: собираются из фактов базы, без ИИ. */
export function professionTemplate(prof: Profession, rec?: Rec | null): Explanation {
  const why = rec?.reasons.length
    ? rec.reasons.slice(0, 3).join(". ").replace(/\.\./g, ".") + "."
    : `${prof.name} — это, например: ${prof.tasks[0].charAt(0).toLowerCase() + prof.tasks[0].slice(1)}. Нужно уметь: ${prof.skills.slice(0, 3).join(", ").toLowerCase()}.`;
  return {
    whyYou: why,
    dayInLife: prof.dayInLife,
    askStudents: [
      "С какого курса вы начали работать по профессии? Где?",
      "Какие предметы на старших курсах реально пригодились?",
      "Куда устроились выпускники прошлого года? Сколько им предложили на старте?",
      `Чему учат в вузе, а что приходится учить самому (${prof.stack.slice(0, 3).join(", ")})?`,
    ],
  };
}

export function universityTemplate(uni: University, programNames: string[]): Explanation {
  return {
    whyYou: `${uni.description}${programNames.length ? ` Тебе могут подойти: ${programNames.slice(0, 3).join(", ")}.` : ""}`,
    dayInLife:
      "Приди на день открытых дверей или просто в обычный учебный день. Зайди в столовую и библиотеку. " +
      "Посмотри доски объявлений: какие там клубы, хакатоны и стажировки. Спроси на кафедре, можно ли посидеть на паре. " +
      "Почитай группы студентов в VK и Telegram — там видно, как живут на самом деле.",
    askStudents: [
      "Сколько длится учебный день? Остаётся время на подработку?",
      "Что в учёбе оказалось не так, как обещали на дне открытых дверей?",
      "Как устроена практика: компании приходят сами или ищешь сам?",
      uni.dorm ? "Как с общежитием: сколько человек в комнате, легко ли получить место на 1 курсе?" : "Где живут студенты из других городов? Сколько стоит жильё рядом?",
      ...(uni.vuc ? ["Как попасть на военную кафедру и сколько времени она забирает?"] : []),
    ],
  };
}
