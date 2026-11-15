import { expect, type Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/auth/login");
    await expect(this.page.locator('input[type="email"]')).toBeVisible({
      timeout: 10000,
    });
  }

  async login(
    email = "admin@tun.io.vn",
    password = process.env.DEMO_SEED_PASSWORD ||
      process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
      "dev-seed-password-2026",
  ) {
    const emailInput = this.page.locator('input[type="email"]');
    const passwordInput = this.page.locator('input[type="password"]');
    const submitBtn = this.page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitBtn.click();
  }

  async expectDashboardRedirect(timeoutMs = 15000) {
    await this.page.waitForURL(/\/dashboard/, { timeout: timeoutMs });
    expect(this.page.url()).toContain("/dashboard");
  }

  async verifyHttpOnlyCookies() {
    const cookies = await this.page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === "haihire_token");
    const refreshCookie = cookies.find(
      (c) => c.name === "haihire_refresh_token",
    );

    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.value.length).toBeGreaterThan(10);
    expect(tokenCookie?.httpOnly).toBe(true);

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.value.length).toBeGreaterThan(10);
    expect(refreshCookie?.httpOnly).toBe(true);
  }

  async verifyZeroLocalStorageTokens() {
    const tokens = await this.page.evaluate(() => ({
      access: localStorage.getItem("haihire_recruiter_token"),
      refresh: localStorage.getItem("haihire_recruiter_refresh_token"),
      bearer:
        localStorage.getItem("token") || localStorage.getItem("accessToken"),
    }));

    expect(tokens.access).toBeNull();
    expect(tokens.refresh).toBeNull();
    expect(tokens.bearer).toBeNull();
  }
}
