import fs from "node:fs";
import path from "node:path";
import type { RawData } from "./validate";

const FILES: Record<keyof RawData, string> = {
  regions: "regions.json",
  specialties: "specialties.json",
  professions: "professions.json",
  universities: "universities.json",
  programs: "programs.json",
  events: "events.json",
  priorities: "priorities.json",
  egeSubjects: "ege_subjects.json",
};

export function loadRawJson(dir = path.resolve(process.cwd(), "data")): RawData {
  const out = {} as Record<keyof RawData, unknown>;
  for (const [k, f] of Object.entries(FILES)) {
    out[k as keyof RawData] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  }
  return out as RawData;
}
