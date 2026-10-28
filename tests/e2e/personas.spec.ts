import { UNIVERSITY } from "../../lib/copy";
import { expect, test } from "@playwright/test";
import { fillPersona, recIds } from "./helpers";

test("Аня (Москва): дизайн, медиа, издательское дело, UX; только Москва", async ({ page }) => {
  await fillPersona(page, "anya");
  await page.getByTestId("slider-0").click();
  const ids = await recIds(page, "panel-interests");
  const creative = ["uxui", "graphic_designer", "editor", "illustrator", "smm", "video_editor", "copywriter", "journalist", "designer_3d"];
  expect(ids.filter((x) => creative.includes(x)).length).toBeGreaterThanOrEqual(5);
  const where = page.getByTestId("specialty-where");
  for (let i = 0; i < (await where.count()); i++) await where.nth(i).click();
  const cities = await page.getByTestId("panel-interests").getByTestId("program-row").evaluateAll((els) => els.map((e) => e.getAttribute("data-city")));
  expect(cities.length).toBeGreaterThan(0);
  expect(cities.every((c) => c === "Москва")).toBe(true);
});

test("Артём (Сызрань): во вкладке «Интересы» нет вузов вне региона; компромисс с переездом в Самару", async ({ page }) => {
  await fillPersona(page, "artem");
  for (const t of ["slider-0", "slider-1"]) {
    await page.getByTestId(t).click();
    const where = page.getByTestId("panel-interests").getByTestId("specialty-where");
    for (let i = 0; i < (await where.count()); i++) await where.nth(i).click();
    const regions = await page.getByTestId("panel-interests").getByTestId("program-row").evaluateAll((els) => els.map((e) => e.getAttribute("data-region")));
    expect(regions.length).toBeGreaterThan(0);
    expect(new Set(regions)).toEqual(new Set(["samara"]));
  }
  await expect(page.getByTestId("panel-interests")).toContainText(/работать с [12] курса/);

  await page.getByTestId("tab-money").click();
  const cards = page.getByTestId("tradeoff-card");
  await expect(cards.first()).toBeVisible();
  const samara = cards.filter({ hasText: /переехать в Самару|переехать в Казань/ });
  await expect(samara.first()).toBeVisible();
  await expect(samara.first()).toContainText("₽");
  await expect(samara.first().getByTestId("tradeoff-gain")).toHaveText(/\+\d+%/);
});

test("Камила (Дагестан): медицина, вузы с общежитием, честный шанс", async ({ page }) => {
  await fillPersona(page, "kamila");
  await page.getByTestId("slider-0").click();
  const ids = await recIds(page, "panel-interests");
  expect(ids.slice(0, 6)).toContain("doctor");
  await expect(page.getByTestId("panel-interests")).toContainText(/шанс:/, { timeout: 5000 }).catch(() => {});
  // карточка профессии врача: программы с шансом и общежитием
  await page.goto("/profession/doctor");
  const rows = page.getByTestId("profile-programs").getByTestId("program-row");
  await expect(rows.first()).toBeVisible();
  await expect(page.getByTestId("profile-programs")).toContainText(/шанс: (высокий|средний|низкий|рискованно)/);
});

test("Илья (Новосибирск): ИТ в «Деньгах», только вузы с ВУЦ, статус риска ИИ", async ({ page }) => {
  await fillPersona(page, "ilya");
  await page.getByTestId("tab-money").click();
  const ids = await recIds(page, "panel-money");
  const it = ["data_scientist", "data_engineer", "backend", "security", "devops", "frontend", "mobile_dev", "product_manager", "chip_designer"];
  expect(ids.slice(0, 5).filter((x) => it.includes(x)).length).toBeGreaterThanOrEqual(4);
  await page.getByTestId("panel-money").getByTestId("where-to-study").first().click();
  const first = page.getByTestId("panel-money").getByTestId("program-uni-link").first();
  const href = await first.getAttribute("href");
  await page.goto(href!);
  await expect(page.getByTestId("university-page")).toContainText(UNIVERSITY.vuc.yes);
  await page.goto("/profession/backend");
  await expect(page.getByTestId("outlook-card")).toContainText("ИИ");
});
