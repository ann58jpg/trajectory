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
  await page.getByRole("radio", { name: QUIZ.egeOrder.options.chosen }).click();
  await page.getByTestId("quiz-next").click();
  // русский выбран сам и его нельзя снять
  await expect(page.getByRole("checkbox", { name: /Русский язык/ })).toBeDisabled();
  await expect(page.getByTestId("rus-score-needed")).toBeVisible();
  for (const s of ["Математика (профильная)", "Информатика"]) await page.getByRole("checkbox", { name: s, exact: true }).click();
  // базовая и профильная математика взаимоисключающие, базовую честно предупреждаем
  await page.getByRole("checkbox", { name: "Математика (базовая)", exact: true }).click();
  await expect(page.getByTestId("math-base-warning")).toBeVisible();
  await page.getByRole("checkbox", { name: "Математика (профильная)", exact: true }).click();
  await expect(page.getByTestId("math-base-warning")).toBeHidden();
  for (let k = 0; k < 3; k++) await page.getByRole("button", { name: QUIZ.ege.setScore }).first().click();
  await expect(page.getByTestId("rus-score-needed")).toBeHidden();
  await page.getByTestId("quiz-next").click();
  // доп. экзамены в вузе
  await expect(page.getByTestId("quiz-title")).toHaveText(QUIZ.dvi.title);
  await page.getByRole("checkbox", { name: QUIZ.dvi.none }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: "11 класс" }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("checkbox", { name: "интересно само по себе" }).nth(2).click();
  await page.getByTestId("quiz-next").click();
  await page.getByRole("radio", { name: "Региональный" }).click();
  await page.getByTestId("quiz-next").click();

  // D: хобби, игра, как хочешь работать, мечта
  await page.getByRole("checkbox", { name: "Программирование и игры" }).click();
  await page.getByRole("checkbox", { name: "Техника, роботы, дроны" }).click();
  await page.getByTestId("quiz-next").click();
  await expect(page.getByTestId("quiz-title")).toHaveText(QUIZ.game.title);
  for (let r = 1; r <= 12; r++) {
    await expect(page.getByTestId("game-round")).toHaveText(QUIZ.game.round(r, 12));
    // профессия скрыта до выбора и открывается после
    await expect(page.getByTestId("game-reveal")).toHaveCount(0);
    if (r === 3) await page.getByTestId("game-none").click();
    else if (r === 4) await page.getByTestId("game-all").click();
    else await page.getByTestId("game-card").first().click();
    await expect(page.getByTestId("game-reveal").first()).toContainText("Это задача:");
    await page.getByTestId("game-next").click();
  }
  await expect(page.getByTestId("game-summary")).toBeVisible();
  await page.getByTestId("quiz-next").click();
  await expect(page.getByTestId("quiz-title")).toHaveText(QUIZ.formats.title);
  await page.getByRole("checkbox", { name: QUIZ.formats.options.remote }).click();
  await page.getByRole("checkbox", { name: QUIZ.formats.options.flexible }).click();
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
