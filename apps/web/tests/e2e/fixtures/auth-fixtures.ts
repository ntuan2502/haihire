import { test as base, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./seed-helpers";

export interface TestFixtures {
  adminCookie: string;
  memberCookie: string;
  betaAdminCookie: string;
  adminPage: Page;
  memberPage: Page;
  betaAdminPage: Page;
}

export const test = base.extend<TestFixtures>({
  adminCookie: async ({ playwright, baseURL }, provideFixture) => {
    const request = await playwright.request.newContext({
      baseURL:
        baseURL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:13000",
    });
    const cookie = await loginAsAdmin(
      request,
      "admin@tun.io.vn",
      process.env.DEMO_SEED_PASSWORD ||
        process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
        "dev-seed-password-2026",
    );
    await provideFixture(cookie);
    await request.dispose();
  },

  memberCookie: async ({ playwright, baseURL }, provideFixture) => {
    const request = await playwright.request.newContext({
      baseURL:
        baseURL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:13000",
    });
    const cookie = await loginAsAdmin(
      request,
      "member@tun.io.vn",
      process.env.DEMO_SEED_PASSWORD ||
        process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
        "dev-seed-password-2026",
    );
    await provideFixture(cookie);
    await request.dispose();
  },

  betaAdminCookie: async ({ playwright, baseURL }, provideFixture) => {
    const request = await playwright.request.newContext({
      baseURL:
        baseURL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:13000",
    });
    const cookie = await loginAsAdmin(
      request,
      "admin@beta.haihire.local",
      process.env.DEMO_SEED_PASSWORD ||
        process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
        "dev-seed-password-2026",
    );
    await provideFixture(cookie);
    await request.dispose();
  },

  adminPage: async ({ browser, baseURL, adminCookie }, provideFixture) => {
    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: {
        Cookie: adminCookie,
      },
    });
    const page = await context.newPage();
    await provideFixture(page);
    await context.close();
  },

  memberPage: async ({ browser, baseURL, memberCookie }, provideFixture) => {
    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: {
        Cookie: memberCookie,
      },
    });
    const page = await context.newPage();
    await provideFixture(page);
    await context.close();
  },

  betaAdminPage: async (
    { browser, baseURL, betaAdminCookie },
    provideFixture,
  ) => {
    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: {
        Cookie: betaAdminCookie,
      },
    });
    const page = await context.newPage();
    await provideFixture(page);
    await context.close();
  },
});

export { expect };
