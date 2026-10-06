import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./frontend/tests/e2e",
  timeout: process.env.CI ? 300000 : 60000,
  fullyParallel: true,
  forbidOnly: !process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:13000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:13000",
    reuseExistingServer: true,
    timeout: process.env.CI ? 300000 : 120000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NODE_ENV: process.env.NODE_ENV || "test",
    },
  },
});
