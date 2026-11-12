import { expect, test } from "@playwright/test";
import { VIBE } from "../../lib/copy";

test("студентка ВШЭ проходит тест вайба: с демо-вайбом её ответ — 10-й, и на странице ВШЭ появляется вайб", async ({ page }) => {
  const tracked: string[] = [];
  page.on("request", (r) => { if (r.url().endsWith("/api/track")) tracked.push(r.postDataBuffer()?.toString() ?? ""); });
  // демо-вайб включается в /admin
  await page.goto("/admin");
  await page.getByTestId("demo-vibe-toggle").click();
  await expect(page.getByTestId("demo-vibe-toggle")).toHaveAttribute("aria-pressed", "true");
  // до ответа — 9 из 10
  await page.goto("/university/hse");
  await expect(page.getByTestId("vibe-gap")).toContainText(VIBE.gapWhat(9));
  // вход с главной
  await page.goto("/");
  await page.getByTestId("vibe-invite").click();
  await page.getByTestId("vibe-uni-search").fill("ВШЭ");
  await page.getByTestId("vibe-uni-option").first().click();
  await page.getByTestId("vibe-faculty").fill("факультет компьютерных наук");
  await page.getByTestId("vibe-start").click();
  for (let i = 0; i < 13; i++) {
    const q = await page.getByTestId("vibe-q").textContent();
    if (q?.includes("Чем можно заняться")) await page.getByRole("checkbox", { name: "НСО" }).click();
    else if (q?.includes("дух")) await page.getByRole("checkbox", { name: "наука", exact: true }).click();
    else if (q?.includes("3 слова")) for (const t of ["научный", "амбициозный", "дружный"]) await page.getByRole("checkbox", { name: t, exact: true }).click();
    else await page.getByTestId("vibe-option").last().click();
    await page.getByTestId(i < 12 ? "vibe-next" : "vibe-send").click();
  }
  await expect(page.getByTestId("vibe-done")).toBeVisible();
  await expect(page.getByTestId("vibe-radar")).toBeVisible();
  await expect(page.getByTestId("vibe-card-img")).toBeVisible();
  // на странице вуза — вайб с плашкой о демо-данных
  await page.goto("/university/hse");
  await expect(page.getByTestId("vibe-block")).toBeVisible();
  await expect(page.getByTestId("vibe-demo")).toContainText(VIBE.demo);
  await expect.poll(() => tracked.some((x) => x.includes("vibe_test_complete"))).toBe(true);
  // без демо-вайба у ВШЭ снова DataGap: реальный ответ пока один
  await page.goto("/admin");
  await page.getByTestId("demo-vibe-toggle").click();
  await page.goto("/university/hse");
  await expect(page.getByTestId("vibe-gap")).toContainText(VIBE.gapWhat(1));
});
