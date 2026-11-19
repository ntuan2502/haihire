import { test, expect } from "./fixtures/auth-fixtures";
import { PublicCareerPage } from "./pages/PublicCareerPage";

test.describe("Tier 2: Boundary & Corner Cases (E2E Web)", () => {
  test("T2-E2E-01 [F02]: Submitting apply form with invalid email triggers validation warning", async ({
    page,
  }) => {
    const careerPage = new PublicCareerPage(page);
    await careerPage.goto();

    await careerPage.fillApplication({
      firstName: "Tran",
      lastName: "Boundary",
      email: "invalid-email-no-domain",
      phone: "0900000000",
    });

    // Bypass browser HTML5 email validation to trigger React/API validation
    await page.evaluate(() => {
      const emailInput = document.querySelector(
        "form input[type='email']",
      ) as HTMLInputElement;
      if (emailInput) {
        emailInput.type = "text";
        emailInput.value = "invalid-email-no-domain";
        emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await careerPage.uploadResume(
      "boundary.pdf",
      "application/pdf",
      Buffer.from("%PDF-1.4 dummy\n%%EOF"),
    );

    await careerPage.submit();
    await careerPage.expectValidationError();
  });

  test("T2-E2E-02 [F04]: Uploading resume file > 10MB displays size limit error", async ({
    page,
  }) => {
    const careerPage = new PublicCareerPage(page);
    await careerPage.goto();

    const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 2048, "a");
    await careerPage.uploadResume(
      "oversized.pdf",
      "application/pdf",
      oversizedBuffer,
    );

    const errorAlert = page.locator("text=/vượt quá|exceeds.*10MB|quá lớn/i");
    await expect(errorAlert.first()).toBeVisible({ timeout: 6000 });
  });

  test("T2-E2E-03 [F04]: Uploading executable or extensionless file is blocked by input filter", async ({
    page,
  }) => {
    const careerPage = new PublicCareerPage(page);
    await careerPage.goto();

    await careerPage.fillApplication({
      firstName: "Hacker",
      lastName: "Exe",
      email: "badfile@example.com",
    });

    // Attempt to set file with .exe extension
    await careerPage.uploadResume(
      "payload.exe",
      "application/x-msdownload",
      Buffer.from("MZ malicious binary payload"),
    );

    await careerPage.submit();

    // Verify submission is blocked or error message shown
    const validationWarning = page.locator(
      "form [role='alert'], [role='alert'], text=/định dạng|extension|invalid|disallowed/i",
    );
    await expect(validationWarning.first()).toBeVisible({ timeout: 6000 });
  });

  test("T2-E2E-04 [F01, F05]: Tampering URL with foreign organizationId strictly prevents foreign candidate access", async ({
    adminPage,
  }) => {
    const foreignOrgId = "00000000-0000-4000-8000-0000000000b2"; // Org Beta
    await adminPage.goto(`/candidates?organizationId=${foreignOrgId}`);

    // Wait for candidates view content or table to render
    const contentArea = adminPage
      .locator("table, [role='table'], [data-testid='candidate-list'], h1")
      .first();
    await expect(contentArea).toBeVisible({ timeout: 10000 });

    // 1. Presentation Layer Defense: Beta candidate records must NEVER render in caller's DOM
    const bodyContent = await adminPage.locator("body").textContent();
    expect(bodyContent).not.toContain("candidate@beta.test");
    expect(bodyContent).not.toContain("Beta Tran");

    // 2. Gateway Layer Defense: TenantGuard actively blocks cross-tenant query tampering with HTTP 403
    const crossTenantProbe = await adminPage.request.get(
      `/api/candidates?organizationId=${foreignOrgId}`,
    );
    expect(crossTenantProbe.status()).toBe(403);
  });

  test("T2-E2E-05 [F16]: Non-existent subpage under /dashboard renders 404 without crashing app", async ({
    adminPage,
  }) => {
    await adminPage.goto("/dashboard/non-existent-module-xyz");

    const notFoundIndicator = adminPage.locator(
      "text=/404|not found|không tìm thấy/i",
    );
    await expect(notFoundIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test("T2-E2E-06 [F11]: Accessing dashboard directly without auth cookies redirects to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/auth/login");
  });

  test("T2-E2E-07 [F02]: Submitting public application with empty email is blocked by validation", async ({
    page,
  }) => {
    const careerPage = new PublicCareerPage(page);
    await careerPage.goto();

    await careerPage.fillApplication({
      firstName: "Empty",
      lastName: "Email",
      email: "",
    });

    await careerPage.submit();
    const alert = page
      .locator(
        "form [role='alert'], [role='alert'], :invalid, text=/bắt buộc|required/i",
      )
      .first();
    await expect(alert).toBeVisible({ timeout: 6000 });
  });

  test("T2-E2E-08 [F06]: Member account visiting admin webhook settings displays access barrier", async ({
    memberPage,
  }) => {
    await memberPage.goto("/settings/integrations");
    await expect(memberPage.locator("main, h1").first()).toBeVisible({
      timeout: 10000,
    });

    const accessBarrier = memberPage.locator(
      "[data-testid='status-state-403'], text=/403|access denied|không có quyền/i",
    );
    await expect(accessBarrier.first()).toBeVisible({ timeout: 10000 });

    const addBtn = memberPage.locator(
      "#add-webhook-btn, [data-testid='add-webhook-btn']",
    );
    await expect(addBtn).not.toBeVisible();
  });

  test("T2-E2E-09 [F10]: Candidate page with invalid page query parameter falls back cleanly", async ({
    adminPage,
  }) => {
    await adminPage.goto("/candidates?page=-99");
    await expect(
      adminPage.locator("table, [data-testid='candidate-list'], h1").first(),
    ).toBeVisible({ timeout: 10000 });
    expect(adminPage.url()).toContain("/candidates");
  });

  test("T2-E2E-10 [F16]: Public careers route with invalid slug renders not found or empty state", async ({
    page,
  }) => {
    await page.goto("/careers/demo/completely-non-existent-job-slug-12345");
    const notFoundOrRedirect = page
      .locator("text=/not found|không tìm thấy|404|hết hạn|closed/i")
      .first();
    await expect(notFoundOrRedirect).toBeVisible({ timeout: 10000 });
  });
});
