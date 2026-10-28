import { COMMON, EVENTS, OUTLOOK_TEXT, PLAN } from "../../lib/copy";
import { expect, test } from "@playwright/test";
import { fillPersona, recIds } from "./helpers";

test("ползунок мгновенно пересчитывает рейтинг; крайние положения дают разные списки", async ({ page }) => {
  await fillPersona(page, "anya");
  await page.getByTestId("tab-money").click();
  await page.getByTestId("slider-0").click();
  const a = await recIds(page, "panel-money");
  await page.getByTestId("slider-1").click();
  const b = await recIds(page, "panel-money");
  expect(a.join()).not.toEqual(b.join());
  await expect(page.getByTestId("slider-value")).toHaveText("0 / 100");
  // клавиатура: ползунок доступен стрелками
  await page.getByRole("slider", { name: "Интерес или доход" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("slider-value")).toHaveText("1 / 99");
});

test("цепочка Специальность → Профессия → Вуз → Мероприятия без тупиков", async ({ page }) => {
  await fillPersona(page, "artem");
  await page.goto("/specialty/13.03.02");
  await expect(page.getByTestId("specialty-page")).toBeVisible();
  await page.getByTestId("specialty-profession-link").first().click();
  await expect(page.getByTestId("profession-page")).toBeVisible();
  await page.getByTestId("profile-programs").getByTestId("program-uni-link").first().click();
  await expect(page.getByTestId("university-page")).toBeVisible();
  const ev = page.getByTestId("events-block").getByTestId("event-item");
  await expect(ev.first()).toBeVisible();
  const link = await page.getByTestId("event-link").first().getAttribute("href");
  expect(link).toMatch(/^https:\/\//);
});

test("каждая профессия имеет статус перспективы с обоснованием", async ({ page }) => {
  await page.goto("/profession/copywriter");
  await expect(page.getByTestId("outlook-card")).toContainText(OUTLOOK_TEXT.red);
  await page.goto("/profession/drone_engineer");
  await expect(page.getByTestId("outlook-card")).toContainText(OUTLOOK_TEXT.green);
  await expect(page.getByTestId("outlook-card")).toContainText(COMMON.source);
});

test("«Мой план»: добавление, чек-лист, версия для родителей", async ({ page }) => {
  await fillPersona(page, "kamila");
  await page.getByTestId("plan-professions-doctor").first().click();
  await page.goto("/university/dgmu");
  await page.getByTestId("plan-universities-dgmu").click();
  await page.getByTestId("events-block").getByRole("button", { name: EVENTS.add }).first().click();
  await page.goto("/plan");
  await expect(page.getByTestId("plan-profession")).toContainText("Врач");
  await expect(page.getByTestId("plan")).toContainText(PLAN.events);
  await expect(page.getByTestId("plan")).toContainText(PLAN.stagesTitle);
  await expect(page.getByTestId("plan")).toContainText(PLAN.egeOk);
  await page.getByTestId("parents").click();
  await expect(page.getByTestId("parents-view")).toContainText("Зарплата");
  await expect(page.getByTestId("parents-tasks").first().locator("li")).not.toHaveCount(0);
});

test("API: ошибки в формате {error, hint}", async ({ request }) => {
  const r = await request.post("/api/recommend", { data: { relocation: "teleport" } });
  expect(r.status()).toBe(400);
  const j = await r.json();
  expect(j).toHaveProperty("error");
  expect(j).toHaveProperty("hint");
  const e = await request.get("/api/events");
  expect(e.status()).toBe(400);
});
