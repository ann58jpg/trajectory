import { COMMON, COMPARE, OUTLOOK_TEXT } from "../../lib/copy";
import { expect, test } from "@playwright/test";
import { fillPersona, recIds } from "./helpers";

test("переключатель «По интересам | По доходу» мгновенно меняет подборку и запоминается", async ({ page }) => {
  const tracked: string[] = [];
  page.on("request", (r) => { if (r.url().endsWith("/api/track")) tracked.push(r.postDataBuffer()?.toString() ?? ""); });
  await fillPersona(page, "anya");
  await expect(page.getByTestId("mode-interests")).toHaveAttribute("aria-checked", "true");
  const a = await recIds(page);
  await page.getByTestId("mode-money").click();
  await expect(page.getByTestId("directions")).toHaveAttribute("data-mode", "money");
  const b = await recIds(page);
  expect(a.join()).not.toEqual(b.join());
  await page.reload();
  await expect(page.getByTestId("mode-money")).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => tracked.some((x) => x.includes("mode_switch"))).toBe(true);
  // профессии не повторяются между направлениями
  const ids = await recIds(page);
  expect(new Set(ids).size).toBe(ids.length);
});

test("сравнение: галочки на 2–4 карточках, плашка внизу, таблица с подсветкой разницы", async ({ page }) => {
  await fillPersona(page, "ilya");
  const toggles = page.getByTestId("directions").locator("[data-testid^=compare-profession-]");
  for (let i = 0; i < 3; i++) {
    // плашка «Сравнить» прилипает к низу экрана — прокручиваем кнопку в центр
    await toggles.nth(i).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await toggles.nth(i).click();
  }
  await expect(page.getByTestId("compare-open")).toHaveText(COMPARE.tray(3));
  await page.getByTestId("compare-open").click();
  await expect(page.getByTestId("compare-table")).toBeVisible();
  await expect(page.getByTestId("compare-table").locator("thead th")).toHaveCount(4);
  await expect(page.getByTestId("compare-table").locator("[data-best=true]").first()).toBeVisible();
  // очистили — по умолчанию лучшее по интересам против лучшего по доходу
  await page.goto("/results");
  await page.getByTestId("compare-tray").getByRole("button", { name: COMPARE.clear }).click();
  await page.getByTestId("compare-default").click();
  await expect(page.getByTestId("compare-table").locator("thead th")).toHaveCount(3);
});

test("в конце подборки — «Если готов изменить», события месяца и «Тебе это помогло?»", async ({ page }) => {
  const tracked: string[] = [];
  page.on("request", (r) => { if (r.url().endsWith("/api/track")) tracked.push(r.postDataBuffer()?.toString() ?? ""); });
  await fillPersona(page, "artem");
  await expect(page.getByTestId("upcoming-events")).toBeVisible();
  const order = await page.getByTestId("results").evaluate((el) =>
    ["directions", "upcoming-events", "tradeoffs", "feedback"].map((id) => [...el.querySelectorAll("[data-testid]")].findIndex((x) => x.getAttribute("data-testid") === id)));
  expect(order).toEqual([...order].sort((x, y) => x - y));
  await page.getByTestId("feedback-5").click();
  await expect(page.getByTestId("feedback-thanks")).toBeVisible();
  await expect.poll(() => tracked.some((x) => x.includes("\"feedback\"") && x.includes("\"rating\":5"))).toBe(true);
});

test("пробелы в данных и режим презентации", async ({ page }) => {
  await page.goto("/data-gaps");
  await expect(page.getByTestId("gap-row")).not.toHaveCount(0);
  for (const owner of ["СФР", "ФНС", "Вузы", "hh.ru", "Минобрнауки", "Минтруд"]) await expect(page.getByTestId("data-gaps-page")).toContainText(owner);
  await page.goto("/university/msu");
  await expect(page.getByTestId("pass-estimate").or(page.getByTestId("pass-official")).first()).toBeVisible();
  // официальный балл 2025 года — с пометкой и ссылкой на источник
  await page.goto("/university/hse");
  await expect(page.getByTestId("pass-official").first()).toContainText("проходной 2026");
  await page.goto("/university/kubsau");
  await expect(page.getByTestId("pass-2025").first()).toBeVisible();
  await page.goto("/admin");
  await page.getByTestId("presentation-toggle").click();
  await expect(page.getByTestId("presentation-toggle")).toHaveAttribute("aria-pressed", "true");
  await page.goto("/university/msu");
  await expect(page.getByTestId("university-page").getByTestId("data-gap").first()).toBeVisible();
  await expect(page.getByTestId("pass-estimate")).toHaveCount(0);
});

test("/admin/funnel закрыт паролем и показывает воронку", async ({ page, request }) => {
  await request.post("/api/track", { data: { event: "landing_view", sessionId: "e2e-session-1", path: "/" } });
  await request.post("/api/track", { data: { event: "feedback", props: { rating: 4 }, sessionId: "e2e-session-1", path: "/results" } });
  const bad = await request.post("/api/track", { data: { event: "feedback", props: { rating: 9 }, sessionId: "e2e-session-1" } });
  expect(bad.status()).toBe(400);
  await page.goto("/admin/funnel");
  await expect(page.getByTestId("funnel-login")).toBeVisible();
  await page.getByLabel("Пароль").fill("e2e-secret");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByTestId("funnel")).toBeVisible();
  await expect(page.getByTestId("funnel-step")).toHaveCount(7);
  await expect(page.getByTestId("funnel-block")).toHaveCount(5);
  await expect(page.getByTestId("funnel-feedback")).not.toHaveText("—");
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

test("«Маршрут»: следующий шаг, 5 глав; план поступления с шагами, сроками и календарём", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("slogan")).toContainText("Вузопедия помогает поступить");
  await expect(page.getByTestId("chapter")).toHaveCount(5);
  await expect(page.getByTestId("next-step")).toContainText("Пройди тест");
  await fillPersona(page, "kamila");
  await page.getByTestId("fav-professions-doctor").first().click();
  await page.goto("/university/dgmu");
  await page.getByTestId("fav-universities-dgmu").click();
  await expect(page.getByTestId("saved-count")).toHaveText("2");
  await page.goto("/");
  await expect(page.getByTestId("chapter").first()).toHaveAttribute("data-status", "done");
  await page.goto("/plan");
  await expect(page.getByTestId("plan-step")).toHaveCount(10);
  await expect(page.locator("[data-step=consent] [data-testid=critical-badge]")).toBeVisible();
  await page.locator("[data-step=sphere] [data-testid=plan-step-done]").click();
  await expect(page.getByTestId("plan-progress")).toHaveText("1 из 10 шагов готово");
  await expect(page.getByTestId("plan-critical")).toContainText("До ближайшей критической даты");
  const download = page.waitForEvent("download");
  await page.getByTestId("plan-ics").click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  // 2028 — ожидаемые даты
  await page.getByTestId("year-select").selectOption("2028");
  await expect(page.getByTestId("expected-date").first()).toBeVisible();
  await expect(page.getByTestId("parents")).toHaveCount(0);
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
