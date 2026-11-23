import { test as base, expect, type Cookie, type Page } from "@playwright/test";
import {
  SEED_ALPHA_ORG_ID,
  createIsolatedTenant,
  loginWithCookies,
  type IsolatedTenantSession,
} from "./seed-helpers";

export interface TestFixtures {
  adminCookie: string;
  memberCookie: string;
  betaTenant: IsolatedTenantSession;
  betaAdminCookie: string;
  adminPage: Page;
  memberPage: Page;
  betaAdminPage: Page;
}

const DEFAULT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || "http://localhost:13000";

function defaultDemoPassword(): string {
  return (
    process.env.DEMO_SEED_PASSWORD ||
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
    "dev-seed-password-2026"
  );
}

interface AuthSessionFixture {
  cookieHeader: string;
  cookies: Cookie[];
}

export const test = base.extend<
  TestFixtures & {
    _adminSession: AuthSessionFixture;
    _memberSession: AuthSessionFixture;
  }
>({
  _adminSession: async ({ playwright, baseURL }, provideFixture) => {
    const resolvedBase = baseURL || DEFAULT_BASE_URL;
    const request = await playwright.request.newContext({
      baseURL: resolvedBase,
    });
    try {
      const res = await loginWithCookies(
        request,
        "admin@tun.io.vn",
        defaultDemoPassword(),
        SEED_ALPHA_ORG_ID,
        resolvedBase,
      );
      await provideFixture({
        cookieHeader: res.cookieHeader,
        cookies: res.cookies,
      });
    } finally {
      await request.dispose();
    }
  },

  _memberSession: async ({ playwright, baseURL }, provideFixture) => {
    const resolvedBase = baseURL || DEFAULT_BASE_URL;
    const request = await playwright.request.newContext({
      baseURL: resolvedBase,
    });
    try {
      const res = await loginWithCookies(
        request,
        "thao.ngo@tun.io.vn",
        defaultDemoPassword(),
        SEED_ALPHA_ORG_ID,
        resolvedBase,
      );
      await provideFixture({
        cookieHeader: res.cookieHeader,
        cookies: res.cookies,
      });
    } finally {
      await request.dispose();
    }
  },

  betaTenant: async ({ playwright, baseURL }, provideFixture) => {
    const resolvedBase = baseURL || DEFAULT_BASE_URL;
    const request = await playwright.request.newContext({
      baseURL: resolvedBase,
    });
    try {
      const tenant = await createIsolatedTenant(
        request,
        "beta-e2e",
        resolvedBase,
      );
      await provideFixture(tenant);
    } finally {
      await request.dispose();
    }
  },

  adminCookie: async ({ _adminSession }, provideFixture) => {
    await provideFixture(_adminSession.cookieHeader);
  },

  memberCookie: async ({ _memberSession }, provideFixture) => {
    await provideFixture(_memberSession.cookieHeader);
  },

  betaAdminCookie: async ({ betaTenant }, provideFixture) => {
    await provideFixture(betaTenant.cookieHeader);
  },

  adminPage: async ({ browser, baseURL, _adminSession }, provideFixture) => {
    const context = await browser.newContext({
      baseURL: baseURL || DEFAULT_BASE_URL,
    });
    await context.addCookies(_adminSession.cookies);
    const page = await context.newPage();
    await provideFixture(page);
    await context.close();
  },

  memberPage: async ({ browser, baseURL, _memberSession }, provideFixture) => {
    const context = await browser.newContext({
      baseURL: baseURL || DEFAULT_BASE_URL,
    });
    await context.addCookies(_memberSession.cookies);
    const page = await context.newPage();
    await provideFixture(page);
    await context.close();
  },

  betaAdminPage: async ({ browser, baseURL, betaTenant }, provideFixture) => {
    const context = await browser.newContext({
      baseURL: baseURL || DEFAULT_BASE_URL,
    });
    await context.addCookies(betaTenant.cookies);
    const page = await context.newPage();
    await provideFixture(page);
    await context.close();
  },
});

export { expect };
