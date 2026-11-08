import { test, expect } from "@playwright/test";

test.describe("E2E Flow 2: Authentication & Login Flow Verification", () => {
  test("authenticates user with credentials, sets HttpOnly cookie, and redirects to dashboard", async ({
    page,
    context,
  }) => {
    // 1. Navigate to /auth/login
    await page.goto("/auth/login", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/.*\/auth\/login/);

    // 2. Fill login form
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await emailInput.fill("admin@tun.io.vn");
    const demoPassword = process.env.DEMO_SEED_PASSWORD || process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD || "dev-seed-password-2026";
    await passwordInput.fill(demoPassword);

    // 3. Submit form
    await submitBtn.click();

    // 4. Verify redirection to /dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain("/dashboard");

    // 5. Verify cookie haihire_token is set
    const cookies = await context.cookies();
    const tokenCookie = cookies.find((c) => c.name === "haihire_token");
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.value.length).toBeGreaterThan(10);
    expect(tokenCookie?.httpOnly).toBe(true);
  });
});
