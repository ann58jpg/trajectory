import { expect, type Page } from "@playwright/test";

export async function fillPersona(page: Page, id: "anya" | "artem" | "kamila" | "ilya") {
  await page.goto("/quiz");
  await page.getByTestId(`persona-${id}`).click();
  await expect(page.getByTestId("quiz-title")).toHaveText(/Готово/);
  await page.getByTestId("quiz-finish").click();
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
}

/** Профессии текущего списка во вкладке. */
export async function recIds(page: Page, panel: string) {
  return page.getByTestId(panel).getByTestId("rec-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-profession")!));
}
