import type { Klimov, LikeReason } from "@/lib/schemas";
import { QUIZ } from "@/lib/copy";

/** Хобби → теги интересов и типы Климова. */
export const HOBBIES: { id: string; label: string; tags: string[]; klimov: Klimov[] }[] = [
  { id: "sport", label: "Спорт", tags: ["sport", "people"], klimov: ["P", "T"] },
  { id: "drawing", label: "Рисование, дизайн, фото", tags: ["design", "art", "media"], klimov: ["A"] },
  { id: "music", label: "Музыка, театр, танцы", tags: ["art", "theatre", "music", "media"], klimov: ["A", "P"] },
  { id: "video", label: "Видео, блог, соцсети", tags: ["media", "design", "writing", "business"], klimov: ["A", "P"] },
  { id: "programming", label: "Программирование и игры", tags: ["it", "games", "math", "data"], klimov: ["S", "T"] },
  { id: "tech", label: "Техника, роботы, дроны", tags: ["engineering", "electronics", "robotics", "drones"], klimov: ["T"] },
  { id: "nature", label: "Природа и животные", tags: ["nature", "animals", "biology", "ecology", "agro"], klimov: ["N"] },
  { id: "helping", label: "Помогать людям, волонтёрство", tags: ["people", "medicine", "education", "psychology"], klimov: ["P"] },
  { id: "business", label: "Бизнес, продажи, деньги", tags: ["business", "finance", "management"], klimov: ["P", "S"] },
  { id: "reading", label: "Книги, история, языки", tags: ["writing", "history", "languages", "social"], klimov: ["A", "S"] },
  { id: "cooking", label: "Кулинария и рукоделие", tags: ["food", "fashion", "art"], klimov: ["A", "T"] },
  { id: "travel", label: "Путешествия и походы", tags: ["tourism", "travel", "nature", "languages"], klimov: ["P", "N"] },
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

/** 15 вариантов «Как ты хочешь работать?»; те же метки стоят у профессий в workFormats. */
export const WORK_FORMATS: { id: string; label: string }[] = Object.entries(QUIZ.formats.options).map(([id, label]) => ({ id, label }));
/** Форматы «руками/на месте» и «головой/за компьютером» — для стиля работы из игры. */
export const HANDS_FORMATS = new Set(["site", "outdoor", "lab", "shift", "stage"]);
export const HEAD_FORMATS = new Set(["office", "remote", "hybrid"]);

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

