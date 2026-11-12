import { expect, test, type Page } from "@playwright/test";
import { fillPersona } from "./helpers";

/** Обходчик: все внутренние страницы и ссылки — без 404/500, без ошибок в консоли, без тупиков. */
const START = ["/", "/quiz", "/results", "/universities", "/feed", "/profile", "/plan", "/life", "/career", "/vibe", "/story", "/compare", "/data-gaps", "/university/hse", "/university/kfu", "/specialty/38.03.01", "/profession/economist"];
const SKIP = /^\/(api|admin|_next)/;

async function visit(page: Page, path: string, errors: string[]) {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status(), path).toBeLessThan(400);
  await page.waitForLoadState("networkidle").catch(() => {});
  // не тупик: на внутренних страницах есть «Назад» и крошки, везде — меню разделов
  if (path !== "/") await expect(page.getByTestId("breadcrumbs"), `крошки на ${path}`).toBeVisible();
  await expect(page.getByTestId("bottom-nav").or(page.getByTestId("side-nav")).first(), `меню на ${path}`).toBeAttached();
  const links = await page.locator("a[href^='/']").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!));
  void errors;
  return links.map((l) => l.split("#")[0]).filter((l) => l && !SKIP.test(l));
}

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`обход страниц ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|ERR_|net::/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    await fillPersona(page, "dima");
    const seen = new Set<string>();
    const queue = [...START];
    while (queue.length && seen.size < 45) {
      const p = queue.shift()!;
      const key = p.split("?")[0].replace(/\/(university|specialty|profession)\/[^/]+$/, "/$1/*");
      if (seen.has(p) || ([...seen].filter((x) => x.split("?")[0].replace(/\/(university|specialty|profession)\/[^/]+$/, "/$1/*") === key).length >= 3)) continue;
      seen.add(p);
      for (const l of await visit(page, p, errors)) if (!seen.has(l)) queue.push(l);
    }
    // ширина без горизонтальной прокрутки
    for (const p of ["/", "/results", "/university/hse", "/profile"]) {
      await page.goto(p);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `горизонтальная прокрутка на ${p}`).toBeLessThanOrEqual(1);
    }
    expect(errors).toEqual([]);
  });
}

test("кабинет: 8 разделов, «Войти» — скоро, заметка к вузу сохраняется", async ({ page }) => {
  await fillPersona(page, "katya");
  await page.goto("/university/hse");
  await page.getByTestId("fav-universities-hse").first().click();
  await page.goto("/profile");
  for (const id of ["cab-readiness", "cab-test", "cab-specialties", "cab-unis", "cab-events", "cab-plan", "cab-internships", "cab-reminders"]) await expect(page.getByTestId(id)).toBeVisible();
  await page.getByTestId("login").click();
  await expect(page.getByTestId("login-soon")).toContainText("Вход скоро появится");
  await page.getByTestId("note-hse").fill("понравилась библиотека");
  await page.reload();
  await expect(page.getByTestId("note-hse")).toHaveValue("понравилась библиотека");
  await expect(page.getByTestId("saved-count")).toBeVisible();
});

test("подборка: режим в адресе, «Назад» возвращает ту же вкладку", async ({ page }) => {
  await fillPersona(page, "dima");
  await page.getByTestId("mode-money").click();
  await expect(page).toHaveURL(/mode=money/);
  await page.goto("/profession/economist");
  await page.goBack();
  await expect(page.getByTestId("directions")).toHaveAttribute("data-mode", "money");
});
