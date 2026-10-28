import type { Klimov, LikeReason } from "@/lib/schemas";

/** Хобби → теги интересов и типы Климова. */
export const HOBBIES: { id: string; label: string; tags: string[]; klimov: Klimov[] }[] = [
  { id: "sport", label: "Спорт", tags: ["sport", "people"], klimov: ["P", "T"] },
  { id: "drawing", label: "Рисование и дизайн", tags: ["design", "art"], klimov: ["A"] },
  { id: "video", label: "Видео и монтаж", tags: ["media", "design", "art"], klimov: ["A", "T"] },
  { id: "music", label: "Музыка", tags: ["art", "media"], klimov: ["A"] },
  { id: "photo", label: "Фото", tags: ["media", "art", "design"], klimov: ["A"] },
  { id: "programming", label: "Программирование", tags: ["it", "math", "data", "games"], klimov: ["S", "T"] },
  { id: "games", label: "Игры и геймдизайн", tags: ["games", "it", "art"], klimov: ["S", "A"] },
  { id: "blogging", label: "Блогинг и соцсети", tags: ["media", "writing", "business"], klimov: ["P", "A"] },
  { id: "reading", label: "Чтение и письмо", tags: ["writing", "media", "art"], klimov: ["A", "S"] },
  { id: "languages", label: "Иностранные языки", tags: ["languages", "intl"], klimov: ["S", "P"] },
  { id: "tech", label: "Техника и сборка", tags: ["engineering", "electronics", "auto", "machine"], klimov: ["T"] },
  { id: "robots", label: "Роботы", tags: ["robotics", "engineering", "electronics", "it"], klimov: ["T"] },
  { id: "drones", label: "Дроны и авиамодели", tags: ["drones", "aviation", "engineering"], klimov: ["T"] },
  { id: "chemistry", label: "Химия и опыты", tags: ["chemistry", "science", "bio"], klimov: ["N", "T"] },
  { id: "nature", label: "Животные и природа", tags: ["nature", "animals", "biology", "ecology", "agro"], klimov: ["N"] },
  { id: "helping", label: "Помощь людям и волонтёрство", tags: ["people", "medicine", "education", "psychology"], klimov: ["P"] },
  { id: "business", label: "Бизнес и перепродажа", tags: ["business", "finance", "management"], klimov: ["P", "S"] },
  { id: "debates", label: "Дебаты и публичные выступления", tags: ["people", "law", "politics", "media"], klimov: ["P"] },
  { id: "cooking", label: "Кулинария", tags: ["food", "art"], klimov: ["A", "T"] },
  { id: "fashion", label: "Мода", tags: ["fashion", "design", "art"], klimov: ["A"] },
  { id: "travel", label: "Путешествия", tags: ["tourism", "languages", "geology"], klimov: ["P", "N"] },
  { id: "medicine", label: "Медицина и анатомия", tags: ["medicine", "biology"], klimov: ["N", "P"] },
  { id: "law", label: "Право и справедливость", tags: ["law", "social"], klimov: ["P", "S"] },
  { id: "history", label: "История", tags: ["history", "politics", "social"], klimov: ["S", "P"] },
  { id: "space", label: "Космос и астрономия", tags: ["space", "physics", "science"], klimov: ["T", "S"] },
];

export const LIKE_REASONS: { id: LikeReason; label: string; weight: number }[] = [
  { id: "intrinsic", label: "интересно само по себе", weight: 1.0 },
  { id: "olympiad", label: "олимпиадный уровень", weight: 1.0 },
  { id: "easy", label: "даётся легко", weight: 0.8 },
  { id: "hard_ok", label: "сложно, но получается", weight: 0.7 },
  { id: "useful", label: "нравится, потому что пригодится", weight: 0.6 },
  { id: "teacher", label: "нравится из-за учителя", weight: 0.4 },
  { id: "grades_no_like", label: "хорошие оценки, но не нравится", weight: 0.2 },
];
export const LIKE_WEIGHT: Record<LikeReason, number> = Object.fromEntries(
  LIKE_REASONS.map((r) => [r.id, r.weight]),
) as Record<LikeReason, number>;

/** 6 пар в духе RIASEC / Климова. left/right → тип. */
export const TASK_PAIRS: {
  id: string;
  question: string;
  left: { label: string; klimov?: Klimov; style?: "hands" | "head" | "team" | "solo" };
  right: { label: string; klimov?: Klimov; style?: "hands" | "head" | "team" | "solo" };
}[] = [
  { id: "p1", question: "Что ближе?", left: { label: "Работать с людьми: объяснять, помогать, договариваться", klimov: "P" }, right: { label: "Работать с техникой: собирать, чинить, настраивать", klimov: "T" } },
  { id: "p2", question: "Что интереснее?", left: { label: "Знаки и числа: формулы, код, таблицы", klimov: "S" }, right: { label: "Художественные образы: рисунок, текст, музыка", klimov: "A" } },
  { id: "p3", question: "Где комфортнее?", left: { label: "С природой: растения, животные, экспедиции", klimov: "N" }, right: { label: "С механизмами и приборами", klimov: "T" } },
  { id: "p4", question: "Что выберешь?", left: { label: "Вести переговоры и выступать", klimov: "P" }, right: { label: "Разбираться в данных и документах", klimov: "S" } },
  { id: "p5", question: "Как любишь работать?", left: { label: "Руками: делать что-то осязаемое", style: "hands" }, right: { label: "Головой: думать, анализировать, планировать", style: "head" } },
  { id: "p6", question: "С кем?", left: { label: "В команде", style: "team" }, right: { label: "Одному, в своём темпе", style: "solo" } },
];

export const WORK_FORMATS: { id: string; label: string }[] = [
  { id: "office", label: "Офис" },
  { id: "remote", label: "Удалёнка" },
  { id: "production", label: "На производстве" },
  { id: "field", label: "В поле / в разъездах" },
  { id: "business", label: "Своё дело" },
  { id: "gov", label: "Госслужба" },
];

export const GUIDES: { id: string; label: string }[] = [
  { id: "interest", label: "Интерес к профессии или предмету" },
  { id: "income", label: "Высокий доход" },
  { id: "employment", label: "Гарантированное трудоустройство" },
  { id: "prestige", label: "Престиж" },
  { id: "remote", label: "Удалённая работа" },
  { id: "abroad_work", label: "Работа за границей" },
  { id: "passion", label: "Любимое дело" },
  { id: "parents", label: "Совет родителей" },
  { id: "friends", label: "Мнение друзей" },
  { id: "tests", label: "Результаты профтестов" },
  { id: "unknown", label: "Пока не знаю" },
];

export const BENEFITS: { id: string; label: string }[] = [
  { id: "quota", label: "Особая квота" },
  { id: "target", label: "Целевое обучение" },
  { id: "svo", label: "Квота для участников СВО и их детей" },
  { id: "large_family", label: "Многодетная семья" },
  { id: "olympiad", label: "Олимпиады (БВИ / 100 баллов)" },
];

export const ACHIEVEMENTS: { id: string; label: string }[] = [
  { id: "projects", label: "Проекты (школьные, исследовательские)" },
  { id: "contests", label: "Конкурсы и хакатоны" },
  { id: "courses", label: "Курсы и кружки" },
  { id: "portfolio", label: "Портфолио работ" },
  { id: "gto", label: "ГТО / спортивные разряды" },
  { id: "volunteer", label: "Волонтёрская книжка" },
];

export const UNI_CRITERIA: { id: string; label: string }[] = [
  { id: "vibe", label: "Вайб и атмосфера" },
  { id: "location", label: "Расположение" },
  { id: "subjects", label: "Предметы программы" },
  { id: "reviews", label: "Отзывы студентов" },
  { id: "recommendations", label: "Рекомендации знакомых" },
  { id: "prestige", label: "Престиж" },
  { id: "employer_rating", label: "Рейтинг у работодателей" },
  { id: "price", label: "Цена обучения" },
  { id: "benefits", label: "Льготы" },
  { id: "budget_places", label: "Бюджетные места" },
  { id: "credit", label: "Образовательный кредит" },
  { id: "ege_subjects", label: "Предметы ЕГЭ" },
  { id: "pass_score", label: "Проходной балл" },
  { id: "commute", label: "Как добираться" },
  { id: "friends", label: "Друзья поступают туда же" },
  { id: "employment_speed", label: "Скорость трудоустройства" },
  { id: "internships", label: "Стажировки" },
  { id: "work_study", label: "Совмещение работы и учёбы" },
  { id: "schedule", label: "Расписание" },
  { id: "career_help", label: "Помощь с трудоустройством" },
  { id: "studlife", label: "Студенческая жизнь" },
  { id: "dorm", label: "Общежитие" },
  { id: "vuc", label: "Военная кафедра" },
  { id: "exchange", label: "Международные обмены" },
];

/** Поиск по ключевым словам свободного текста (демо-режим без ИИ). Корни слов → теги. */
export const DREAM_KEYWORDS: [RegExp, string[]][] = [
  [/программ|кодит|кодинг|айти|\bit\b|разработ|сайт|приложени/i, ["it"]],
  [/данн|аналит|нейросет|\bии\b|искусствен|машинн.*обуч|ml\b/i, ["data", "it", "math"]],
  [/хакер|кибер|безопасн/i, ["security", "it"]],
  [/врач|медиц|лечит|хирург|больниц|скор(ой|ая)/i, ["medicine", "biology", "people"]],
  [/стоматолог|зуб/i, ["medicine"]],
  [/дизайн|рисова|рисую|иллюстр|художник/i, ["design", "art"]],
  [/интерфейс|ux|ui/i, ["design", "it"]],
  [/инженер|конструк|чертеж|изобрет/i, ["engineering"]],
  [/дрон|беспилот|бпла/i, ["drones", "aviation", "engineering"]],
  [/самол|авиа|летат|пилот/i, ["aviation", "engineering"]],
  [/космос|ракет|спутник|астроном/i, ["space", "physics"]],
  [/робот/i, ["robotics", "engineering"]],
  [/электрон|схем|паять|микросхем/i, ["electronics", "engineering"]],
  [/юрист|адвокат|прав[оа]|суд|справедлив/i, ["law", "social"]],
  [/учител|педагог|преподава|учить детей/i, ["education", "people"]],
  [/журналист|блог|медиа|ведущ|телевид/i, ["media", "writing"]],
  [/книг|писат|писа|редакт|литератур|издат/i, ["writing", "media", "art"]],
  [/психолог/i, ["psychology", "people"]],
  [/бизнес|предприним|сво[её] дело|стартап/i, ["business", "management"]],
  [/животн|ветерин|собак|кошк|лошад/i, ["animals", "biology", "nature"]],
  [/игр(ы|у|ах|ов)|геймдев|гейм/i, ["games", "it", "art"]],
  [/хими/i, ["chemistry"]],
  [/биолог|генет|клетк|днк/i, ["biology", "bio", "science"]],
  [/эколог|природ|лес|климат/i, ["ecology", "nature"]],
  [/энерг|электрик|электрич/i, ["energy", "engineering"]],
  [/нефт|газ/i, ["oil_gas"]],
  [/строит|архитект|здани/i, ["construction"]],
  [/машин|автомоб|авто\b|двигател/i, ["auto", "machine"]],
  [/финанс|банк|эконом|инвест|бухгалт/i, ["finance", "business"]],
  [/маркетинг|реклам|smm|продвиж/i, ["media", "business"]],
  [/мод[аеуы]|одежд|стилист/i, ["fashion", "design"]],
  [/повар|кулинар|ресторан|кондитер/i, ["food"]],
  [/путешеств|туризм|туристи/i, ["tourism"]],
  [/спорт|тренер|футбол|фитнес/i, ["sport"]],
  [/язык|перевод|лингв/i, ["languages"]],
  [/дипломат|международ|мид\b/i, ["politics", "intl", "languages"]],
  [/наук|исследов|учёный|ученый/i, ["science"]],
  [/видео|монтаж|кино|режисс/i, ["media", "art"]],
  [/музык/i, ["art"]],
  [/завод|производств|станок|чпу/i, ["manufacturing", "machine"]],
  [/атом|ядерн|аэс/i, ["nuclear", "energy"]],
  [/геолог|минерал|экспедиц/i, ["geology", "nature"]],
  [/сельск|фермер|агро|урожа/i, ["agro"]],
];

export const DREAM_VALUES: [RegExp, string][] = [
  [/деньг|зарабат|богат|доход|зарплат/i, "доход"],
  [/помога|польз|людям/i, "помогать людям"],
  [/свобод|удалён|удален|путешеств/i, "свобода"],
  [/стабильн|надёжн|надежн|гаранти/i, "стабильность"],
  [/творч|создава|придумыва/i, "творчество"],
  [/власт|руковод|управля|лидер/i, "лидерство"],
];

export const DREAM_FEARS: [RegExp, string][] = [
  [/боюсь|страшно|не уверен/i, "неуверенность в выборе"],
  [/не поступлю|не пройду|баллов не хватит/i, "не хватит баллов"],
  [/ии заменит|нейросети заменят|исчезн/i, "профессию заменит ИИ"],
  [/родител/i, "давление родителей"],
];

