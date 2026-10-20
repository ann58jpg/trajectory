import { z } from "zod";

/* ───────────────────────── Общие ───────────────────────── */

export const Confidence = z.enum(["verified", "estimate"]);
export type Confidence = z.infer<typeof Confidence>;

/** Метаданные источника: прикладываются к каждой группе чисел. */
export const SourceMeta = z.object({
  source: z.string().min(2),
  updatedAt: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  confidence: Confidence,
});
export type SourceMeta = z.infer<typeof SourceMeta>;

export const Klimov = z.enum(["P", "T", "S", "A", "N"]); // человек, техника, знак, худ. образ, природа
export type Klimov = z.infer<typeof Klimov>;

/* ───────────────────────── Справочники ───────────────────────── */

export const EgeSubject = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  tags: z.array(z.string()),
  klimov: z.array(Klimov),
  minScore: z.number(),
});
export type EgeSubject = z.infer<typeof EgeSubject>;

export const City = z.object({
  name: z.string(),
  salaryCoef: z.number().positive(), // относительно региона
  hub: z.boolean().default(false),
});

export const Region = z.object({
  id: z.string(),
  name: z.string(),
  capital: z.string(),
  federalDistrict: z.string(),
  cities: z.array(City).min(1),
  salaryCoef: z.number().positive(),
  medianSalary: z.number().positive(),
  rent: z.number().positive(),
  studentBudget: z.number().positive(),
  vacancyShare: z.number().positive(), // доля вакансий РФ (hh) в регионе
  industries: z.array(z.string()),
  employers: z.array(z.string()),
  neighbors: z.array(z.string()),
  hhAreaId: z.number().int().nullable(),
  meta: SourceMeta,
});
export type Region = z.infer<typeof Region>;

export const SpecialtyLevel = z.enum(["bachelor", "specialist", "spo"]);
export const Specialty = z.object({
  code: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/),
  name: z.string(),
  level: SpecialtyLevel,
  years: z.number().positive(),
  ege: z.object({
    mandatory: z.array(z.string()), // всегда включает rus для вуза
    oneOf: z.array(z.string()), // предмет по выбору (пусто = нет выбора)
  }),
  tags: z.array(z.string()),
  klimov: z.array(Klimov),
  disciplines: z.array(z.string()),
  employment: z.object({ rate: z.number().min(0).max(1), monthsToJob: z.number(), meta: SourceMeta }),
  description: z.string(),
});
export type Specialty = z.infer<typeof Specialty>;

export const Outlook = z.enum(["green", "yellow", "red"]);
export type Outlook = z.infer<typeof Outlook>;

export const Profession = z.object({
  id: z.string(),
  name: z.string(),
  specialties: z.array(z.string()).min(1),
  tasks: z.array(z.string()).min(3),
  skills: z.array(z.string()),
  stack: z.array(z.string()),
  tags: z.array(z.string()).min(1),
  klimov: z.array(Klimov).min(1),
  workFormats: z.array(z.string()),
  salary: z.object({
    junior: z.number(),
    middle: z.number(),
    senior: z.number(),
    ceiling: z.number(),
    meta: SourceMeta,
  }),
  demand: z.object({ vacanciesRF: z.number(), trend: z.number(), meta: SourceMeta }),
  earlyEntryCourse: z.number().int().nullable(), // с какого курса реально работать
  remote: z.enum(["yes", "partial", "no"]),
  outlook: z.object({ status: Outlook, reason: z.string(), source: z.string() }),
  aiRisk: z.number().min(0).max(1),
  priorities: z.array(z.string()),
  industries: z.array(z.string()),
  dayInLife: z.string(),
  similar: z.array(z.string()),
  hhQuery: z.string(),
});
export type Profession = z.infer<typeof Profession>;

export const UniType = z.enum(["university", "college", "online"]);
export const University = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  type: UniType,
  city: z.string(),
  regionId: z.string(),
  abroad: z.boolean(),
  country: z.string().optional(),
  site: z.string().url(),
  admissionUrl: z.string().url(),
  eventsUrl: z.string().url(),
  dorm: z.boolean(),
  vuc: z.boolean(),
  budget: z.boolean(),
  features: z.array(z.string()), // dual, internships, evening, online, target, intl, studlife, career
  ratings: z.object({ raex: z.number().nullable(), employers: z.number().min(0).max(1), meta: SourceMeta }),
  priceFrom: z.number().nullable(),
  priceTo: z.number().nullable(),
  priceMeta: SourceMeta,
  description: z.string(),
  howToGet: z.string(),
  aliases: z.array(z.string()).default([]),
});
export type University = z.infer<typeof University>;

export const StudyForm = z.enum(["full", "evening", "distance", "online"]);
export type StudyForm = z.infer<typeof StudyForm>;

export const Program = z.object({
  id: z.string(),
  universityId: z.string(),
  specialtyCode: z.string(),
  name: z.string(),
  passScore: z.object({
    min: z.number().nullable(), // сумма 3 предметов (или средний балл аттестата ×100 для СПО)
    max: z.number().nullable(),
    year: z.number(),
    meta: SourceMeta,
  }),
  budgetPlaces: z.number().int(),
  targetPlaces: z.number().int(),
  price: z.number().nullable(),
  forms: z.array(StudyForm).min(1),
  keySubjects: z.array(z.string()),
  schedule: z.enum(["morning", "evening", "dense", "free"]),
  partners: z.array(z.string()),
  dual: z.boolean(),
  meta: SourceMeta,
});
export type Program = z.infer<typeof Program>;

export const EventType = z.enum(["open_day", "lecture", "olympiad", "hackathon", "school", "festival", "club", "excursion"]);
export const UniEvent = z.object({
  id: z.string(),
  universityId: z.string(),
  title: z.string(),
  type: EventType,
  format: z.enum(["online", "offline", "mixed"]),
  date: z.string().nullable(), // в seed даты не выдумываем → null
  when: z.string(), // человеческое описание периодичности
  url: z.string().url(),
  why: z.string(),
  source: z.enum(["seed", "ai"]),
});
export type UniEvent = z.infer<typeof UniEvent>;

export const Priority = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source: z.string(),
  url: z.string().url().optional(),
});
export type Priority = z.infer<typeof Priority>;

/* ───────────────────────── Профиль школьника ───────────────────────── */

export const LikeReason = z.enum([
  "easy",
  "hard_ok",
  "intrinsic",
  "teacher",
  "useful",
  "grades_no_like",
  "olympiad",
]);
export type LikeReason = z.infer<typeof LikeReason>;

export const PairAnswer = z.enum(["left", "right", "both"]);

export const StudentProfile = z.object({
  version: z.literal(1).default(1),
  consent: z.boolean().default(false),
  // A
  start: z.enum(["interest", "money", "balance", "unknown"]).nullable().default(null),
  guides: z.array(z.string()).max(3).default([]),
  guideOther: z.string().max(200).default(""),
  moneyHorizon: z.enum(["long", "parttime", "asap", "any"]).nullable().default(null),
  // B
  regionId: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  relocation: z.enum(["no", "region", "nearest", "russia", "abroad"]).nullable().default(null),
  dorm: z.enum(["yes", "no", "unknown"]).nullable().default(null),
  finance: z.enum(["budget", "budget_or_paid", "paid", "credit"]).nullable().default(null),
  paidLimit: z.number().min(0).max(2_000_000).default(300_000),
  benefits: z.array(z.string()).default([]),
  gender: z.enum(["m", "f", "skip"]).nullable().default(null),
  vucImportant: z.enum(["yes", "no", "unknown"]).nullable().default(null),
  // C
  egeOrder: z.enum(["chosen", "by_goal", "undecided"]).nullable().default(null),
  ege: z
    .array(z.object({ subject: z.string(), score: z.number().min(0).max(100).nullable() }))
    .default([]),
  grade: z.enum(["9", "10", "11", "grad"]).nullable().default(null),
  gpa: z.number().min(2).max(5).nullable().default(null),
  subjectLikes: z.record(z.string(), z.array(LikeReason)).default({}),
  olympiad: z.enum(["none", "school", "municipal", "regional", "final", "listed"]).default("none"),
  achievements: z.array(z.string()).default([]),
  achievementsOther: z.string().max(300).default(""),
  // D
  hobbies: z.array(z.string()).default([]),
  hobbyOther: z.string().max(200).default(""),
  taskPairs: z.record(z.string(), PairAnswer).default({}),
  workFormats: z.array(z.string()).default([]),
  dream: z.string().max(2000).default(""),
  // E
  universities: z.array(z.string()).default([]),
  uniCriteria: z.array(z.string()).max(5).default([]),
  // производные (от ИИ-разбора текста), опционально
  aiTags: z.array(z.string()).default([]),
});
export type StudentProfile = z.infer<typeof StudentProfile>;

export const emptyProfile = (): StudentProfile => StudentProfile.parse({});

/* ───────────────────────── Ответы движка ───────────────────────── */

export const FactorKey = z.enum(["demand", "income", "employment", "priority", "match"]);
export type FactorKey = z.infer<typeof FactorKey>;
export const Factors = z.object({
  demand: z.number(),
  income: z.number(),
  employment: z.number(),
  priority: z.number(),
  match: z.number(),
});
export type Factors = z.infer<typeof Factors>;

export const Chance = z.enum(["high", "medium", "low", "risky", "unknown"]);
export type Chance = z.infer<typeof Chance>;

export const ExclusionReason = z.object({
  type: z.enum(["relocation", "finance", "vuc", "dorm", "ege", "abroad"]),
  text: z.string(),
});
export type ExclusionReason = z.infer<typeof ExclusionReason>;

export const ProgramMatch = z.object({
  programId: z.string(),
  universityId: z.string(),
  universityName: z.string(),
  universityShort: z.string(),
  city: z.string(),
  regionId: z.string(),
  specialtyCode: z.string(),
  programName: z.string(),
  forms: z.array(StudyForm),
  passMin: z.number().nullable(),
  passMax: z.number().nullable(),
  passConfidence: Confidence,
  userSum: z.number().nullable(),
  chance: Chance,
  price: z.number().nullable(),
  budgetPlaces: z.number(),
  score: z.number(),
  criteriaHits: z.array(z.string()),
  online: z.boolean(),
  local: z.boolean(),
  excluded: z.array(ExclusionReason),
});
export type ProgramMatch = z.infer<typeof ProgramMatch>;

export const Rec = z.object({
  professionId: z.string(),
  name: z.string(),
  specialtyCodes: z.array(z.string()),
  factors: Factors,
  bonus: z.number(), // горизонт денег и пр. (уже нормирован)
  bonusNotes: z.array(z.string()),
  salary: z.object({
    junior: z.number(),
    middle: z.number(),
    senior: z.number(),
    ceiling: z.number(),
    regionName: z.string(),
    confidence: Confidence,
    source: z.string(),
  }),
  vacancies: z.number(),
  vacanciesTrend: z.number(),
  outlook: Outlook,
  outlookReason: z.string(),
  earlyEntryCourse: z.number().nullable(),
  remote: z.enum(["yes", "partial", "no"]),
  reasons: z.array(z.string()),
  available: z.boolean(), // есть хотя бы одна программа после фильтров
  egeOk: z.boolean(),
  programs: z.array(ProgramMatch), // прошедшие фильтры (топ)
  onlineElsewhere: z.number(), // онлайн-программы вне региона (для «не готов переезжать»)
  years: z.number(),
});
export type Rec = z.infer<typeof Rec>;

export const TradeoffChange = z.object({
  type: z.enum(["add_ege", "replace_ege", "raise_score", "relocate", "paid", "target", "drop_vuc", "drop_dorm", "form"]),
  text: z.string(),
  cost: z.number(),
});
export type TradeoffChange = z.infer<typeof TradeoffChange>;

export const Tradeoff = z.object({
  professionId: z.string(),
  professionName: z.string(),
  changes: z.array(TradeoffChange).min(1),
  programId: z.string(),
  universityId: z.string(),
  universityName: z.string(),
  city: z.string(),
  salaryNow: z.number(),
  salaryNowLabel: z.string(),
  salaryNew: z.number(),
  gainAbs: z.number(),
  gainPct: z.number(),
  sacrifices: z.array(z.string()),
  sentence: z.string(),
  confidence: Confidence,
  match: z.number(),
});
export type Tradeoff = z.infer<typeof Tradeoff>;

export const ComparisonSide = z.object({
  professionId: z.string(),
  name: z.string(),
  salary1: z.number(),
  salary3: z.number(),
  salary5: z.number(),
  years: z.number(),
  match: z.number(),
  outlook: Outlook,
  aiRisk: z.number(),
  risks: z.array(z.string()),
  sacrifices: z.array(z.string()),
  roi: z.array(z.object({ year: z.number(), cumulative: z.number() })),
  tuitionPerYear: z.number(),
});
export type ComparisonSide = z.infer<typeof ComparisonSide>;

export const RecommendResponse = z.object({
  recs: z.array(Rec), // все профессии с сырыми факторами — ползунок пересчитывает на клиенте
  specialties: z.array(z.object({ code: z.string(), name: z.string(), level: SpecialtyLevel, years: z.number() })),
  specialtyPrograms: z.record(z.string(), z.array(ProgramMatch)),
  tradeoffs: z.array(Tradeoff),
  comparison: z.object({ interests: ComparisonSide.nullable(), money: ComparisonSide.nullable() }),
  portrait: z.string(),
  confidence: z.number(),
  missing: z.array(z.string()),
  egeAdvice: z.array(z.string()),
  startT: z.number(),
  mode: z.enum(["ai", "demo"]),
  generatedAt: z.string(),
});
export type RecommendResponse = z.infer<typeof RecommendResponse>;

/* ───────────────────────── ИИ ───────────────────────── */

export const DreamParse = z.object({
  tags: z.array(z.string()).max(12),
  values: z.array(z.string()).max(6),
  fears: z.array(z.string()).max(6),
});
export type DreamParse = z.infer<typeof DreamParse>;

export const Explanation = z.object({
  whyYou: z.string().min(10).max(1200),
  dayInLife: z.string().min(10).max(1500),
  askStudents: z.array(z.string()).min(1).max(6),
});
export type Explanation = z.infer<typeof Explanation>;

export const AiEvent = z.object({
  title: z.string().min(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: EventType,
  format: z.enum(["online", "offline", "mixed"]),
  url: z.string().url(),
  why: z.string(),
});
export const AiEvents = z.object({ events: z.array(AiEvent).max(10) });

export const ApiError = z.object({ error: z.string(), hint: z.string() });
