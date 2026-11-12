import { z } from "zod";
import { STORY } from "@/lib/copy";

export const SALARIES = ["s50", "s80", "s120", "s200", "s200p", "none"] as const;

/** История выпускника из формы /story. Фамилии и контактов не собираем. */
export const StoryInput = z.object({
  universityId: z.string().min(1).max(80),
  specialty: z.string().trim().min(2).max(120),
  gradYear: z.number().int().min(1960).max(2030),
  age: z.number().int().min(16).max(90).nullable(),
  sphere: z.string().trim().max(80),
  position: z.string().trim().min(2).max(120),
  salary: z.enum(SALARIES),
  city: z.string().trim().min(2).max(80),
  advice: z.string().trim().max(600),
  name: z.string().trim().max(40),
  anonymous: z.boolean(),
  consent: z.literal(true),
});
export type StoryInput = z.infer<typeof StoryInput>;
export type Story = StoryInput & { id: string; status: "pending" | "approved" | "rejected"; createdAt: string };

/** «Маша, 27 лет. Экономика в КФУ → аналитик (банк), Казань.» */
export function storyLine(s: Pick<Story, "name" | "anonymous" | "age" | "specialty" | "position" | "sphere" | "city">, uniShort: string) {
  const name = s.anonymous || !s.name ? STORY.anon : s.name;
  return STORY.line({ who: STORY.ageWho(name, s.age), spec: s.specialty, uni: uniShort, position: s.position, sphere: s.sphere, city: s.city });
}
