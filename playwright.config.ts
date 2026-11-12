import { defineConfig, devices } from "@playwright/test";

// Если версия браузера не совпадает с @playwright/test, укажите путь: PW_CHROMIUM_PATH=/path/to/chrome
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: false } },
  ],
  webServer: {
    command: "npm run dev",
    // пароль для /admin/funnel в тестах; в проде задаётся в переменных окружения
    // своё хранилище ответов и историй на каждый прогон — тесты не мешают друг другу
    env: { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "e2e-secret", LOCAL_STORE_PATH: `test-results/e2e-store-${Date.now()}.db` },
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
