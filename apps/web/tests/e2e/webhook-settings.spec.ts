import { test, expect } from "@playwright/test";

test.describe("Webhook Settings E2E Flow", () => {
  const adminUser = {
    id: "admin-user-id",
    name: "Admin User",
    email: "admin@tun.io.vn",
    role: "ADMIN",
    organizationId: "org-1",
    organization: {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
    },
  };

  const memberUser = {
    id: "member-user-id",
    name: "Member User",
    email: "member@tun.io.vn",
    role: "MEMBER",
    organizationId: "org-1",
    organization: {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
    },
  };

  test("Case 1: Admin creates Telegram webhook setting and verifies it appears in list", async ({
    page,
  }) => {
    // 1. Mock auth/me for admin
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem("haihire_recruiter_token", token);
      localStorage.setItem("haihire_recruiter_user", JSON.stringify(user));
      document.cookie = `haihire_token=${token}; path=/; max-age=86400`;
      document.cookie = `haihire_has_org=true; path=/; max-age=86400`;
    }, { token: "mock-jwt-token-admin-12345", user: adminUser });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(adminUser),
      });
    });

    const webhooksList = [
      {
        id: "webhook-existing-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "DISCORD",
        webhookUrl: "https://discord.com/api/webhooks/123/***",
        secretToken: null,
        chatId: null,
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "admin-user-id",
        updatedBy: "admin-user-id",
      },
    ];

    // 2. Mock GET /webhook-settings
    await page.route("**/api/webhook-settings", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(webhooksList),
        });
      } else if (route.request().method() === "POST") {
        const postData = JSON.parse(route.request().postData() || "{}");
        const createdItem = {
          id: "webhook-created-2",
          organizationId: "org-1",
          eventType: postData.eventType || "DLQ_ALERT",
          provider: postData.provider || "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot***/sendMessage",
          secretToken: null,
          chatId: postData.chatId || "-100123456789",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "admin-user-id",
          updatedBy: "admin-user-id",
        };
        webhooksList.push(createdItem);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(createdItem),
        });
      } else {
        await route.continue();
      }
    });

    // 3. Navigate to integrations page
    await page.goto("/dashboard/settings/integrations");
    await page.waitForLoadState("networkidle");

    // 4. Verify Add Webhook button is visible for admin
    const addBtn = page.locator("#add-webhook-btn");
    await expect(addBtn).toBeVisible({ timeout: 10000 });

    // 5. Click Add Webhook to open modal
    await addBtn.click();

    // 6. Fill form
    const urlInput = page.locator("input[placeholder*='telegram.org']");
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    await urlInput.fill("https://api.telegram.org/bot123456:ABC-DEF/sendMessage");

    const chatIdInput = page.locator("input[placeholder='-100123456789']");
    await expect(chatIdInput).toBeVisible();
    await chatIdInput.fill("-100123456789");

    // 7. Click Save button in modal
    const saveBtn = page.locator("button:has-text('Save'), button:has-text('Lưu')").last();
    await saveBtn.click();

    // 8. Verify new Telegram webhook appears in list
    await expect(page.locator("text=Telegram").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=https://api.telegram.org/bot***/sendMessage").first()).toBeVisible({ timeout: 5000 });
  });

  test("Case 2: Admin tests webhook connection and receives toast notification", async ({
    page,
  }) => {
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem("haihire_recruiter_token", token);
      localStorage.setItem("haihire_recruiter_user", JSON.stringify(user));
      document.cookie = `haihire_token=${token}; path=/; max-age=86400`;
      document.cookie = `haihire_has_org=true; path=/; max-age=86400`;
    }, { token: "mock-jwt-token-admin-12345", user: adminUser });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(adminUser),
      });
    });

    await page.route("**/api/webhook-settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "webhook-test-1",
            organizationId: "org-1",
            eventType: "DLQ_ALERT",
            provider: "TELEGRAM",
            webhookUrl: "https://api.telegram.org/bot***/sendMessage",
            secretToken: null,
            chatId: "-100123456789",
            isEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route("**/api/webhook-settings/test", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Webhook test sent successfully",
        }),
      });
    });

    await page.goto("/dashboard/settings/integrations");
    await page.waitForLoadState("networkidle");

    // Click test connection button in row
    const testRowBtn = page.locator("button:has(svg.lucide-send)").first();
    await expect(testRowBtn).toBeVisible({ timeout: 10000 });
    await testRowBtn.click();

    // Verify toast notification appears
    const toast = page.locator("[data-sonner-toast], div[role='status']");
    await expect(toast.first()).toBeVisible({ timeout: 5000 });
  });

  test("Case 3: Member cannot see Add Webhook button and sees admin-only warning", async ({
    page,
  }) => {
    // Mock member user
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem("haihire_recruiter_token", token);
      localStorage.setItem("haihire_recruiter_user", JSON.stringify(user));
      document.cookie = `haihire_token=${token}; path=/; max-age=86400`;
      document.cookie = `haihire_has_org=true; path=/; max-age=86400`;
    }, { token: "mock-jwt-token-member-12345", user: memberUser });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(memberUser),
      });
    });

    await page.route("**/api/webhook-settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/dashboard/settings/integrations");
    await page.waitForLoadState("networkidle");

    // Add button should NOT be visible
    const addBtn = page.locator("#add-webhook-btn");
    await expect(addBtn).not.toBeVisible();

    // Admin only indicator should be visible
    const adminNotice = page.locator("svg.lucide-shield-alert");
    await expect(adminNotice.first()).toBeVisible({ timeout: 5000 });
  });
});
