import regions from "@/data/regions.json";
import specialties from "@/data/specialties.json";
import professions from "@/data/professions.json";
import universities from "@/data/universities.json";
import programs from "@/data/programs.json";
import events from "@/data/events.json";
import priorities from "@/data/priorities.json";
import egeSubjects from "@/data/ege_subjects.json";
import type { RawData } from "./validate";

/** Фолбэк для приложения, если БД ещё не создана: справочники вшиты в сборку. */
export const rawStatic: RawData = { regions, specialties, professions, universities, programs, events, priorities, egeSubjects };
