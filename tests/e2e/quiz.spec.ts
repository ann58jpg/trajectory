import { QUIZ } from "../../lib/copy";
import { expect, test } from "@playwright/test";

test("анкету можно пройти целиком на 375px, ответы не теряются при обновлении", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("demo-badge")).toBeVisible();
  await page.getByTestId("start-quiz").click();
  await expect(page.getByTestId("quiz")).toBeVisible();

  // согласие
  await expect(page.getByTestId("quiz-next")).toBeDisabled();
  await page.getByRole("checkbox", { name: QUIZ.consent.agree }).click();
  await page.getByTestId("quiz-next").click();

  // A1–A3
  await page.getByRole("radio", { name: QUIZ.start.options.balance }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("checkbox", { name: "Высокий доход" }).click();
  await page.getByRole("checkbox", { name: "Удалённая работа" }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: QUIZ.horizon.options.parttime }).click();
  await page.getByTestId("quiz-next").click();

  // B4 регион — с поиском
  await page.getByLabel("Поиск региона").fill("Казань");
  await page.getByRole("radio", { name: "Республика Татарстан" }).click();
  await page.getByRole("radio", { name: "Казань" }).click();

  // обновление страницы посреди анкеты — ответы и шаг сохраняются
  await page.reload();
  await expect(page.getByTestId("quiz-title")).toHaveText("Где ты живёшь?");
  await expect(page.getByRole("radio", { name: "Республика Татарстан" })).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("quiz-next").click();

  // B5–B8
  await page.getByRole("radio", { name: QUIZ.relocation.options.nearest }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: "Да" }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: "Только бюджет" }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: "Не хочу указывать" }).click();
  await page.getByTestId("quiz-next").click();

  // C9–C13
  await page.getByRole("radio", { name: /уже выбрал/ }).click();
  await page.getByTestId("quiz-next").click();
  for (const s of ["Русский язык", "Математика (профильная)", "Информатика"]) await page.getByRole("checkbox", { name: s, exact: true }).click();
  for (let k = 0; k < 3; k++) await page.getByRole("button", { name: "указать" }).first().click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: "11 класс" }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("checkbox", { name: "интересно само по себе" }).nth(2).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: "Региональный" }).click();
  await page.getByTestId("quiz-next").click();

  // D14–D17
  await page.getByRole("checkbox", { name: "Программирование" }).click();
  await page.getByRole("checkbox", { name: "Роботы" }).click();
  await page.getByTestId("quiz-next").click();
  for (const id of ["Работать с техникой", "Знаки и числа", "С механизмами", "Разбираться в данных", "Головой", "В команде"]) {
    await page.getByRole("radio", { name: new RegExp(id) }).click();
  }
  await page.getByTestId("quiz-next").click();
  await page.getByRole("checkbox", { name: "Удалёнка" }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByLabel("Кем хочешь стать").fill("Хочу делать роботов и программировать их, и чтобы хорошо платили");
  await page.getByTestId("quiz-next").click();

  // E18–E19
  await page.getByLabel("Поиск вуза").fill("Иннополис");
  await page.getByRole("checkbox", { name: /Иннополис/ }).first().click();
  await page.getByTestId("quiz-next").click();
  for (const c of ["Бюджетные места", "Стажировки", "Общежитие"]) await page.getByRole("checkbox", { name: c, exact: true }).click();
  await page.getByTestId("quiz-next").click();

  await expect(page.getByTestId("quiz-title")).toHaveText(/Готово/);
  await expect(page.getByTestId("completeness")).toHaveText(/100%/);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(375);

  await page.getByTestId("quiz-finish").click();
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("portrait")).toContainText("Казани");
  await expect(page.getByTestId("disclaimer")).toContainText("а не гарантия");
});
