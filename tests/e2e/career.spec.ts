import { expect, test } from "@playwright/test";

test("страница вуза: порядок блоков по v3", async ({ page }) => {
  await page.goto("/university/kfu");
  const ids = ["section-vibe", "section-programs", "section-life", "section-alumni", "section-where", "section-events"];
  const ys: number[] = [];
  for (const id of ids) {
    const el = page.getByTestId(id);
    await expect(el).toBeVisible();
    ys.push((await el.boundingBox())!.y);
  }
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  await expect(page.getByTestId("breadcrumbs")).toBeVisible();
  await expect(page.getByTestId("alumnus").first()).toBeVisible();
  await expect(page.getByTestId("life-communities").locator("a").first()).toHaveAttribute("href", /vk\.com|t\.me/);
});

test("история выпускника: форма → модерация → видна на странице вуза", async ({ page }) => {
  await page.goto("/story?u=kfu");
  await expect(page.getByTestId("story-uni-picked")).toBeVisible();
  await page.getByTestId("story-specialty").fill("Экономика");
  await page.getByTestId("story-gradYear").fill("2021");
  await page.getByTestId("story-age").fill("27");
  await page.getByTestId("story-sphere").fill("банк");
  await page.getByTestId("story-position").fill("аналитик");
  await page.getByTestId("story-city").fill("Казань");
  await page.getByTestId("story-name").fill("Маша");
  await page.getByTestId("story-advice").fill("Учи SQL с первого курса");
  await expect(page.getByTestId("story-send")).toBeDisabled();
  await page.getByTestId("story-consent").check();
  await page.getByTestId("story-send").click();
  await expect(page.getByTestId("story-sent")).toBeVisible();

  // до модерации история не видна
  await page.goto("/university/kfu");
  await expect(page.getByTestId("stories-empty")).toBeVisible();

  await page.goto("/admin/stories");
  await page.locator("input[name=password]").fill(process.env.ADMIN_PASSWORD ?? "e2e-secret");
  await page.getByTestId("stories-login").locator("button[type=submit]").click();
  await page.getByTestId("story-approve").first().click();
  await expect(page.getByTestId("story-approve")).toHaveCount(0);

  await page.goto("/university/kfu");
  await expect(page.getByTestId("story").first()).toContainText("Маша, 27 лет. Экономика в КФУ → аналитик (банк), Казань.");
});

test("карьера: лестница, стажировки, hh — DataGap без ключей", async ({ page }) => {
  await page.goto("/career");
  await expect(page.getByTestId("ladder-rung")).toHaveCount(4);
  await expect(page.getByTestId("internship").first()).toBeVisible();
  await expect(page.getByTestId("career-hh").getByTestId("data-gap")).toBeVisible();
  await page.getByTestId("fav-internships-yandex").click();
  await expect(page.getByTestId("fav-internships-yandex")).toHaveAttribute("aria-pressed", "true");
});

test("студжизнь и лента: пустое состояние → вуз в избранном", async ({ page }) => {
  await page.goto("/life");
  await expect(page.getByTestId("life-empty")).toBeVisible();
  await page.goto("/university/hse");
  await page.getByTestId("fav-universities-hse").first().click();
  await page.goto("/life");
  await expect(page.getByTestId("life-uni")).toHaveCount(1);
  await page.goto("/feed?tab=internships");
  await expect(page.getByTestId("feed-internships")).toBeVisible();
  await expect(page.getByTestId("feed-events")).toHaveCount(0);
});
