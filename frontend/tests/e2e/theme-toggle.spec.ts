import { test, expect } from "@playwright/test";

test.describe("Theme Toggle E2E Flow", () => {
  test("toggles between light and dark theme and persists across page reload", async ({ page }) => {
    // 1. Navigate to auth/login page
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    // 2. Locate theme toggle button by aria-label or button selector
    const toggleButton = page.locator("button[aria-label*='theme' i], button[aria-label*='giao diện' i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)").first();
    await expect(toggleButton).toBeVisible({ timeout: 5000 });

    // 3. Click theme toggle button to open theme dropdown
    await toggleButton.click();

    // 4. Select Dark theme option
    const darkOption = page.locator("[role='menuitem']:has-text('Dark'), [role='menuitem']:has-text('Tối')").first();
    await expect(darkOption).toBeVisible({ timeout: 5000 });
    await darkOption.click();

    // 5. Verify dark class is applied to <html> element
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 });

    // 6. Refresh page and verify dark theme persists
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 });

    // 7. Toggle back to Light theme
    const toggleButtonAfterReload = page.locator("button[aria-label*='theme' i], button[aria-label*='giao diện' i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)").first();
    await toggleButtonAfterReload.click();

    const lightOption = page.locator("[role='menuitem']:has-text('Light'), [role='menuitem']:has-text('Sáng')").first();
    await expect(lightOption).toBeVisible({ timeout: 5000 });
    await lightOption.click();

    // 8. Verify light theme (no dark class or class="light")
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 5000 });

    // 9. Refresh again and verify light theme persists
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 5000 });
  });
});
