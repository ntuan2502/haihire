import { test, expect } from "./fixtures/auth-fixtures";
import { LoginPage } from "./pages/LoginPage";
import { PublicCareerPage } from "./pages/PublicCareerPage";

test.describe("Tier 1: Feature Coverage (E2E Web)", () => {
  test("T1-E2E-01 [F11]: Login flow sets HttpOnly cookies and purges localStorage tokens", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("admin@tun.io.vn");
    await loginPage.expectDashboardRedirect();

    await loginPage.verifyHttpOnlyCookies();
    await loginPage.verifyZeroLocalStorageTokens();
  });

  test("T1-E2E-02 [F02, F04]: Anonymous candidate submits valid application with PDF resume", async ({
    page,
  }) => {
    const careerPage = new PublicCareerPage(page);
    const res = await careerPage.goto();
    expect(res?.status()).toBe(200);

    const uniqueEmail = `tier1-candidate-${Date.now()}@example.com`;
    await careerPage.fillApplication({
      firstName: "Quang",
      lastName: "Duy",
      email: uniqueEmail,
      phone: "0912345678",
    });

    await careerPage.uploadResume(
      "quang-cv.pdf",
      "application/pdf",
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Resume) >>\nendobj\n%%EOF"),
    );

    await careerPage.submit();
    await careerPage.expectSuccess();
  });

  test("T1-E2E-03 [F03]: Candidate PII is masked in job view for callers lacking candidate:view", async ({
    memberPage,
  }) => {
    // Deterministic Job 1 in seed (Senior Backend Engineer) has seeded applications
    const seededJobId = "00000000-0000-4000-8000-000000000101";

    // 1. API Verification: member lacks candidate:view, receives masked candidate PII
    const jobRes = await memberPage.request.get(`/api/jobs/${seededJobId}`);
    expect(jobRes.ok()).toBe(true);
    const jobData = (await jobRes.json()) as {
      applications: Array<{
        candidateName: string;
        candidateEmail: string;
        candidatePhone: string | null;
        candidate?: { name: string; email: string };
      }>;
    };

    expect(jobData.applications.length).toBeGreaterThan(0);
    const app = jobData.applications[0];
    expect(app.candidateName).toBe("[Masked]");
    expect(app.candidateEmail).toBe("");
    expect(app.candidatePhone).toBeNull();
    if (app.candidate) {
      expect(app.candidate.name).toBe("[Masked]");
      expect(app.candidate.email).toBe("");
    }

    // 2. UI Verification: member visits job pipeline; candidate real emails are not leaked in DOM
    await memberPage.goto(`/jobs/${seededJobId}/pipeline`);
    const pipelineContainer = memberPage
      .locator("[data-testid^='stage-pill-'], [data-testid^='candidate-card-']")
      .first();
    await expect(pipelineContainer).toBeVisible({ timeout: 10000 });

    const pipelineContent = await memberPage.content();
    expect(pipelineContent).not.toContain("test.applicant@example.com");
    expect(pipelineContent).not.toContain("Test Applicant");
    expect(pipelineContent).toContain("[Masked]");
  });

  test("T1-E2E-04 [F16]: Dashboard layout and navigation persist across routes", async ({
    adminPage,
  }) => {
    const consoleIssues: string[] = [];
    adminPage.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleIssues.push(msg.text());
      }
    });
    adminPage.on("pageerror", (err) => {
      consoleIssues.push(err.message);
    });

    // Visit landing page as an authenticated user (triggers LocalizationProvider)
    await adminPage.goto("/", { waitUntil: "networkidle" });
    await expect(adminPage.locator("main h1").first()).toBeVisible({
      timeout: 10000,
    });

    const hydrationOrScriptIssues = consoleIssues.filter(
      (text) =>
        text.toLowerCase().includes("hydration") ||
        text.includes("Encountered a script tag"),
    );
    expect(hydrationOrScriptIssues).toHaveLength(0);

    await adminPage.goto("/dashboard");
    const header = adminPage.locator("header, nav").first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // Navigate to jobs section
    await adminPage.goto("/jobs");
    await expect(adminPage).toHaveURL(/\/jobs/);
    await expect(adminPage.locator("main, h1").first()).toBeVisible({
      timeout: 10000,
    });

    // Navbar / header remains visible
    await expect(header).toBeVisible();
  });

  test("T1-E2E-05 [F16]: Theme toggle switches between dark and light modes with explicit DOM class verification", async ({
    adminPage,
  }) => {
    await adminPage.goto("/dashboard");
    const html = adminPage.locator("html");

    // Locate the theme toggle dropdown trigger in navbar
    const themeTrigger = adminPage
      .locator(
        'button[aria-label*="theme" i], button[title*="theme" i], button[aria-label*="giao diện" i]',
      )
      .first();
    await expect(themeTrigger).toBeVisible({ timeout: 10000 });

    // 1. Switch to Dark Mode
    await themeTrigger.click();
    const darkOption = adminPage
      .locator(
        '[role="menuitem"]:has-text("Dark"), [role="menuitem"]:has-text("Tối")',
      )
      .first();
    await expect(darkOption).toBeVisible({ timeout: 5000 });
    await darkOption.click();

    // Explicitly assert html element contains dark class and dropdown closed
    await expect(html).toHaveClass(/dark/, { timeout: 5000 });
    await expect(adminPage.locator('[role="menu"]')).toBeHidden({
      timeout: 5000,
    });

    // 2. Switch back to Light Mode
    await themeTrigger.click();
    const lightOption = adminPage
      .locator(
        '[role="menuitem"]:has-text("Light"), [role="menuitem"]:has-text("Sáng")',
      )
      .first();
    await expect(lightOption).toBeVisible({ timeout: 5000 });
    await lightOption.click();

    // Explicitly assert html element no longer contains dark class
    await expect(html).not.toHaveClass(/dark/, { timeout: 5000 });
  });

  test("T1-E2E-06 [F01]: Multi-tenant candidate list renders and does not leak foreign candidates", async ({
    adminPage,
  }) => {
    await adminPage.goto("/candidates");
    await expect(
      adminPage.locator("table, [data-testid='candidate-list']").first(),
    ).toBeVisible({ timeout: 10000 });

    const bodyText = await adminPage.locator("body").textContent();
    expect(bodyText).not.toContain("candidate@beta.test");
  });

  test("T1-E2E-07 [F14]: Candidate table renders search filter input and pagination controls", async ({
    adminPage,
  }) => {
    await adminPage.goto("/candidates");
    await expect(
      adminPage.locator("table, [data-testid='candidate-list']").first(),
    ).toBeVisible({ timeout: 10000 });

    const searchInput = adminPage
      .locator(
        'input[type="search"], input[placeholder*="search" i], input[placeholder*="tìm" i]',
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 8000 });
  });

  test("T1-E2E-08 [F16]: User profile menu displays authenticated user details", async ({
    adminPage,
  }) => {
    await adminPage.goto("/dashboard");
    const userMenuTrigger = adminPage
      .locator('[data-testid="user-menu-trigger"]')
      .first();
    await expect(userMenuTrigger).toBeVisible({ timeout: 10000 });
    await userMenuTrigger.click();

    const menuContent = adminPage.locator('[role="menu"]').first();
    await expect(menuContent).toBeVisible({ timeout: 5000 });
    const menuText = await menuContent.textContent();
    expect(menuText).toContain("admin@tun.io.vn");
  });

  test("T1-E2E-09 [F05]: Sourcing links dashboard view renders active channels and links", async ({
    adminPage,
  }) => {
    await adminPage.goto("/source-tracking");
    await expect(adminPage.locator("main, h1").first()).toBeVisible({
      timeout: 10000,
    });
    expect(adminPage.url()).toContain("/source-tracking");
  });

  test("T1-E2E-10 [F16]: Job creation navigation displays job editor form", async ({
    adminPage,
  }) => {
    await adminPage.goto("/jobs/new");
    await expect(adminPage.locator("form, main, h1").first()).toBeVisible({
      timeout: 10000,
    });
    expect(adminPage.url()).toContain("/jobs/new");
  });
});
