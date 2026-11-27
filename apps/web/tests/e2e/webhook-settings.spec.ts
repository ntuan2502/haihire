import { test, expect } from "./fixtures/auth-fixtures";

test.describe("Webhook Settings E2E Flow", () => {
  test("Case 1: Admin creates Telegram webhook setting and verifies it appears in list", async ({
    adminPage: page,
  }) => {
    const webhooksList = [
      {
        id: "webhook-existing-1",
        organizationId: "00000000-0000-4000-8000-000000000010",
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

    // Mock GET / POST /webhook-settings (auth verified by real adminPage session)
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
          organizationId: "00000000-0000-4000-8000-000000000010",
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

    await page.goto("/settings/integrations/webhooks");
    await page.waitForLoadState("networkidle");

    const addBtn = page.locator("#add-webhook-btn");
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const urlInput = page.locator("input[placeholder*='telegram.org']");
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    await urlInput.fill(
      "https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
    );

    const chatIdInput = page.locator("input[placeholder='-100123456789']");
    await expect(chatIdInput).toBeVisible();
    await chatIdInput.fill("-100123456789");

    const saveBtn = page
      .locator("button:has-text('Save'), button:has-text('Lưu')")
      .last();
    await saveBtn.click();

    await expect(page.locator("text=Telegram").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator("text=https://api.telegram.org/bot***/sendMessage").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("Case 2: Admin tests webhook connection and receives toast notification", async ({
    adminPage: page,
  }) => {
    await page.route("**/api/webhook-settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "webhook-test-1",
            organizationId: "00000000-0000-4000-8000-000000000010",
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

    await page.goto("/settings/integrations/webhooks");
    await page.waitForLoadState("networkidle");

    const testRowBtn = page.locator("button:has(svg.lucide-send)").first();
    await expect(testRowBtn).toBeVisible({ timeout: 10000 });
    await testRowBtn.click();

    const toast = page.locator(
      "[data-sonner-toast], div[role='alert'], div[role='status']",
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });
  });

  test("Case 3: Member cannot see Add Webhook button and sees admin-only warning", async ({
    memberPage: page,
  }) => {
    await page.goto("/settings/integrations/webhooks");
    await page.waitForLoadState("networkidle");

    const addBtn = page.locator("#add-webhook-btn");
    await expect(addBtn).not.toBeVisible();

    const adminNotice = page
      .locator("[data-testid='status-state-403'], svg.lucide-shield-alert")
      .first();
    await expect(adminNotice).toBeVisible({ timeout: 10000 });
  });
});
