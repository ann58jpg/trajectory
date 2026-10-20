import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/** Справочники храним как JSON-документы: структура валидируется zod при seed и чтении. */
const doc = (name: string) =>
  sqliteTable(name, {
    id: text("id").primaryKey(),
    data: text("data").notNull(),
  });

export const regions = doc("regions");
export const specialties = doc("specialties");
export const professions = doc("professions");
export const universities = doc("universities");
export const programs = doc("programs");
export const events = doc("events");
export const priorities = doc("priorities");
export const egeSubjects = doc("ege_subjects");

/** Кэш внешних источников (hh.ru — 24 ч, ИИ-поиск мероприятий — 12 ч). */
export const cache = sqliteTable("cache", {
  key: text("key").primaryKey(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull(),
});
