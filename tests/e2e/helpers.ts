import { expect, type Page } from "@playwright/test";
import type { PersonaId } from "../../lib/personas";

export async function fillPersona(page: Page, id: PersonaId) {
  await page.goto("/quiz");
  await page.getByTestId(`persona-${id}`).click();
  await expect(page.getByTestId("quiz-title")).toHaveText(/Готово/);
  await page.getByTestId("quiz-finish").click();
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
}

/** Профессии в текущей подборке (направления сверху вниз). */
export async function recIds(page: Page) {
  return page.getByTestId("directions").getByTestId("rec-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-profession")!));
}

/** Раскрыть «Где учиться» у всех направлений и вернуть строки программ. */
export async function openPrograms(page: Page) {
  const where = page.getByTestId("directions").getByTestId("specialty-where");
  for (let i = 0; i < (await where.count()); i++) await where.nth(i).click();
  return page.getByTestId("directions").getByTestId("program-row");
}
