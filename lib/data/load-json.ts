import fs from "node:fs";
import path from "node:path";
import type { RawData } from "./validate";

const FILES: Record<Exclude<keyof RawData, "specialties">, string> = {
  regions: "regions.json",
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
  // Направления разложены по группам: data/specialties/NN.json
  const specDir = path.join(dir, "specialties");
  out.specialties = fs.readdirSync(specDir).filter((f) => f.endsWith(".json")).sort()
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(specDir, f), "utf8")) as unknown[]);
  return out as RawData;
}
