import { test, expect } from "@playwright/test";

const CAREER_PAGE_URL = "/careers/admin/senior-backend-engineer-nestjs-postgresql";

test.describe("Apply Form E2E Flow", () => {
  test("submitting with invalid email triggers validation error", async ({ page }) => {
    await page.goto(CAREER_PAGE_URL);
    await page.waitForLoadState("networkidle");

    // Fill names
    const textInputs = page.locator("form input[type='text']");
    await textInputs.nth(0).fill("Nguyen");
    await textInputs.nth(1).fill("Van Test");

    // Fill invalid email (e.g. invalid-email-format without proper domain)
    // Note: To bypass browser HTML5 email validation and hit React / API validation:
    await page.evaluate(() => {
      const emailInput = document.querySelector("form input[type='email']") as HTMLInputElement;
      if (emailInput) {
        emailInput.type = "text";
        emailInput.value = "invalid-email-format";
        emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    // Provide dummy PDF file
    await page.setInputFiles("input[type='file']", {
      name: "sample-resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 sample resume content\n%%EOF"),
    });

    // Click submit
    await page.locator("form button[type='submit']").click();

    // Verify error alert appears
    const errorAlert = page.locator("form .p-3\\.5.rounded-2xl, form [class*='text-rose']");
    await expect(errorAlert.first()).toBeVisible({ timeout: 5000 });
    const errorText = await errorAlert.first().textContent();
    expect(errorText).toBeTruthy();
    expect(errorText?.length).toBeGreaterThan(0);
  });

  test("submitting valid application creates application and shows success UI", async ({ page }) => {
    const response = await page.goto(CAREER_PAGE_URL);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    // Ensure page rendered with heading
    const heading = page.locator("h1");
    await expect(heading.first()).toBeVisible({ timeout: 10000 });

    const uniqueEmail = `test-candidate-${Date.now()}@example.com`;

    // Fill candidate details
    const textInputs = page.locator("form input[type='text']");
    await textInputs.nth(0).fill("Do");
    await textInputs.nth(1).fill("Minh Tri");

    const emailInput = page.locator("form input[type='email']");
    await emailInput.fill(uniqueEmail);

    const phoneInput = page.locator("form input[type='tel']");
    await phoneInput.fill("0909123456");

    // Upload PDF file
    await page.setInputFiles("input[type='file']", {
      name: "tri-resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Resume) >>\nendobj\n%%EOF"),
    });

    // Verify file name appears in UI
    await expect(page.locator("text=tri-resume.pdf")).toBeVisible({ timeout: 5000 });

    // Intercept POST request to verify HTTP response
    const submitResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/applications") && res.request().method() === "POST",
      { timeout: 15000 },
    );

    // Submit form
    await page.locator("form button[type='submit']").click();

    const submitResponse = await submitResponsePromise;
    expect([200, 201]).toContain(submitResponse.status());

    // Verify Success screen is displayed
    const successTitle = page.locator("text=/Application Submitted|Ứng tuyển thành công/i");
    await expect(successTitle.first()).toBeVisible({ timeout: 10000 });
  });

  test("EC4: uploading file > 10MB displays size limit error and blocks submission", async ({ page }) => {
    await page.goto(CAREER_PAGE_URL);
    await page.waitForLoadState("networkidle");

    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024, "a");

    await page.setInputFiles("input[type='file']", {
      name: "oversized-resume.pdf",
      mimeType: "application/pdf",
      buffer: largeBuffer,
    });

    const errorText = page.locator("text=/vượt quá|exceeds.*10MB/i");
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
  });
});

