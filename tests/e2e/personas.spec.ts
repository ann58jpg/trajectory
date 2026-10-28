import { UNIVERSITY } from "../../lib/copy";
import { expect, test } from "@playwright/test";
import { fillPersona, openPrograms, recIds } from "./helpers";

test("Аня (Москва): дизайн, медиа, издательское дело, UX; только Москва", async ({ page }) => {
  await fillPersona(page, "anya");
  const ids = await recIds(page);
  const creative = ["uxui", "graphic_designer", "editor", "illustrator", "smm", "video_editor", "copywriter", "journalist", "designer_3d", "writer", "painter", "pr_specialist", "game_designer"];
  expect(ids.filter((x) => creative.includes(x)).length).toBeGreaterThanOrEqual(4);
  const cities = await (await openPrograms(page)).evaluateAll((els) => els.map((e) => e.getAttribute("data-city")));
  expect(cities.length).toBeGreaterThan(0);
  expect(cities.every((c) => c === "Москва")).toBe(true);
});

test("Артём (Сызрань): в подборке нет вузов вне региона; компромисс с переездом в Самару", async ({ page }) => {
  await fillPersona(page, "artem");
  for (const mode of ["interests", "money"]) {
    await page.getByTestId(`mode-${mode}`).click();
    const regions = await (await openPrograms(page)).evaluateAll((els) => els.map((e) => e.getAttribute("data-region")));
    expect(regions.length).toBeGreaterThan(0);
    expect(new Set(regions)).toEqual(new Set(["samara"]));
  }
  const cards = page.getByTestId("tradeoff-card");
  await expect(cards.first()).toBeVisible();
  const samara = cards.filter({ hasText: /Если переедешь в (Самару|Казань)/ });
  await expect(samara.first()).toBeVisible();
  await expect(samara.first()).toContainText(/примерно на \d+% выше/);
  await expect(samara.first().getByTestId("tradeoff-gain")).toContainText("₽");
});

test("Камила (Дагестан): медицина, вузы с общежитием, честный шанс", async ({ page }) => {
  await fillPersona(page, "kamila");
  const ids = await recIds(page);
  expect(ids.slice(0, 6)).toContain("doctor");
  await page.goto("/profession/doctor");
  const rows = page.getByTestId("profile-programs").getByTestId("program-row");
  await expect(rows.first()).toBeVisible();
  await expect(page.getByTestId("profile-programs")).toContainText(/шанс: (высокий|средний|низкий|рискованно)/);
});

test("Илья (Новосибирск): ИТ по доходу, только вузы с ВУЦ, статус риска ИИ", async ({ page }) => {
  await fillPersona(page, "ilya");
  await page.getByTestId("mode-money").click();
  const ids = await recIds(page);
  const it = ["data_scientist", "data_engineer", "backend", "security", "devops", "frontend", "mobile_dev", "product_manager", "chip_designer", "pentester", "calc_engineer", "crypto_analyst"];
  expect(ids.slice(0, 5).filter((x) => it.includes(x)).length).toBeGreaterThanOrEqual(4);
  await openPrograms(page);
  const href = await page.getByTestId("directions").getByTestId("program-uni-link").first().getAttribute("href");
  await page.goto(href!);
  await expect(page.getByTestId("university-page")).toContainText(UNIVERSITY.vuc.yes);
  await page.goto("/profession/backend");
  await expect(page.getByTestId("outlook-card")).toContainText("ИИ");
});

test("Тимур (Казань): госуправление в топ-5 направлений, КФУ и РАНХиГС", async ({ page }) => {
  await fillPersona(page, "timur");
  const codes = await page.getByTestId("specialty-group").evaluateAll((els) => els.map((e) => e.getAttribute("data-code")));
  expect(codes).toContain("38.03.04");
  const gmu = page.locator('[data-testid=specialty-group][data-code="38.03.04"]');
  await gmu.getByTestId("specialty-where").click();
  await expect(gmu.getByTestId("specialty-programs")).toContainText("КФУ");
  await expect(gmu.getByTestId("specialty-programs")).toContainText("РАНХиГС");
});

test("Соня (Ярославль): театр в подборке, Ярославский театральный среди вузов", async ({ page }) => {
  await fillPersona(page, "sonya");
  await expect(page.getByTestId("portrait")).toContainText("в Ярославле");
  const codes = await page.getByTestId("specialty-group").evaluateAll((els) => els.map((e) => e.getAttribute("data-code")));
  const theatre = codes.find((c) => c && ["52.05.01", "52.05.02", "52.03.05"].includes(c));
  expect(theatre).toBeTruthy();
  const card = page.locator(`[data-testid=specialty-group][data-code="${theatre}"]`);
  await card.getByTestId("specialty-where").click();
  await expect(card.getByTestId("specialty-programs")).toContainText(/ГИТИС|РГИСИ|Ярославский театральный/);
});
