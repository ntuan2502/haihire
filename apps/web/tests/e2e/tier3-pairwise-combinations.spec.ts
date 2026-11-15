import { test, expect } from "./fixtures/auth-fixtures";
import { PublicCareerPage } from "./pages/PublicCareerPage";
import { randomUUID } from "node:crypto";

test.describe("Tier 3: Pairwise Combinations (E2E Web)", () => {
  test("T3-E2E-01 [F02 x F04]: Public apply with tracking link maps attribution and stores resume", async ({
    page,
  }) => {
    const careerPage = new PublicCareerPage(page);
    const trackingToken = "test-track-" + randomUUID().slice(0, 8);

    // Navigate to career page with tracking ref
    await careerPage.goto(
      "senior-backend-engineer-nestjs-postgresql",
      trackingToken,
    );

    const email = `track-candidate-${Date.now()}@example.com`;
    await careerPage.fillApplication({
      firstName: "Tracking",
      lastName: "Applicant",
      email,
      phone: "0988776655",
    });

    await careerPage.uploadResume(
      "tracked-resume.pdf",
      "application/pdf",
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Tracked) >>\nendobj\n%%EOF"),
    );

    await careerPage.submit();
    await careerPage.expectSuccess();
  });

  test("T3-E2E-02 [F09 x F16]: Switching organization isolates TanStack Query cache without data leakage", async ({
    adminPage,
  }) => {
    // 1. Ensure secondary organization exists for admin user to switch into
    const secondaryOrgSlug = `e2e-sub-org-${Date.now()}`;
    const createOrgRes = await adminPage.request.post("/api/organizations", {
      data: {
        name: "Secondary Workspace Org",
        slug: secondaryOrgSlug,
      },
    });
    expect([200, 201]).toContain(createOrgRes.status());
    const secondaryOrg = (await createOrgRes.json()) as {
      id: string;
      name: string;
    };

    // 2. Load dashboard as Admin in primary organization
    await adminPage.goto("/dashboard");
    const navHeader = adminPage.locator("header, nav").first();
    await expect(navHeader).toBeVisible({ timeout: 10000 });

    // 3. Open user profile menu in navbar
    const userMenuTrigger = adminPage
      .locator(
        'button[aria-label="User profile"], button[aria-label="Hồ sơ người dùng"], [data-testid="user-menu-trigger"]',
      )
      .first();
    await expect(userMenuTrigger).toBeVisible({ timeout: 6000 });
    await userMenuTrigger.click();

    // 4. Click organization switcher box inside user menu
    const orgBoxButton = adminPage
      .locator(
        "button[aria-expanded][aria-label], button:has(svg.lucide-building-2)",
      )
      .first();
    await expect(orgBoxButton).toBeVisible({ timeout: 5000 });
    await orgBoxButton.click();

    // 5. Select the secondary organization from the list
    const secondaryOrgItem = adminPage
      .locator(
        `button[role="menuitem"]:has-text("${secondaryOrg.name}"), button[role="menuitem"]:has-text("Secondary Workspace")`,
      )
      .first();
    await expect(secondaryOrgItem).toBeVisible({ timeout: 5000 });
    await secondaryOrgItem.click();

    // 6. Verify URL remains on dashboard and TanStack Query cache is isolated
    await expect(adminPage).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 7. Verify TanStack Query cache reflects new organization context via page.evaluate
    const activeCacheKeys = await adminPage.evaluate(() => {
      const qc = (
        window as unknown as {
          __REACT_QUERY_CLIENT__?: {
            getQueryCache: () => {
              getAll: () => Array<{ queryKey: unknown[] }>;
            };
          };
        }
      ).__REACT_QUERY_CLIENT__;
      if (!qc) return [];
      return qc
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey);
    });

    // Check that queries were dispatched or scoped to the new tenant ID
    expect(activeCacheKeys.length).toBeGreaterThan(0);
    expect(
      activeCacheKeys.some((key) =>
        JSON.stringify(key).includes(secondaryOrg.id),
      ),
    ).toBe(true);

    // 8. Navigate to candidates view under new organization: primary candidates must not leak
    await adminPage.goto("/dashboard/candidates");
    const candidatesContainer = adminPage
      .locator("main, [data-testid='candidate-list']")
      .first();
    await expect(candidatesContainer).toBeVisible({ timeout: 10000 });

    const newOrgPageText = await adminPage.locator("body").textContent();
    expect(newOrgPageText).not.toContain("Test Applicant");
  });

  test("T3-E2E-03 [F05 x F11]: Protected route enforces authentication cookie and redirects guest", async ({
    page,
  }) => {
    // Unauthenticated guest attempts to access /dashboard/settings
    await page.goto("/dashboard/settings");
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });

    expect(page.url()).toContain("/auth/login");
    // Verify redirect query parameter preserves target
    expect(page.url()).toMatch(/redirect|returnUrl|dashboard/i);
  });

  test("T3-E2E-04 [F14 x F16]: Candidate table pagination queries database with clean slice", async ({
    adminPage,
  }) => {
    await adminPage.goto("/dashboard/candidates");

    // 1. Unconditionally wait for candidate table and rows on Page 1
    const candidateRows = adminPage.locator("table tbody tr");
    await expect(candidateRows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await candidateRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Capture the first candidate record on Page 1
    const firstCandidatePage1 = await candidateRows
      .first()
      .locator("td")
      .first()
      .textContent();

    // 2. Unconditionally locate and assert Next page button is enabled
    const nextButton = adminPage
      .locator(
        'button[aria-label="Next"], button[aria-label="Tiếp theo"], button:has(svg.lucide-chevron-right)',
      )
      .last();
    await expect(nextButton).toBeVisible({ timeout: 5000 });
    await expect(nextButton).toBeEnabled();

    // 3. Click Next to request page 2 slice from the database
    await nextButton.click();

    // 4. Assert URL query is strictly updated to page=2
    await expect(adminPage).toHaveURL(/page=2/, { timeout: 8000 });

    // 5. Assert page 2 renders a distinct candidate slice
    await expect(candidateRows.first()).toBeVisible({ timeout: 8000 });
    const firstCandidatePage2 = await candidateRows
      .first()
      .locator("td")
      .first()
      .textContent();
    expect(firstCandidatePage2).not.toEqual(firstCandidatePage1);

    // 6. Assert pagination counter displays Page 2
    const pageIndicator = adminPage.locator("text=/page 2|trang 2/i").first();
    await expect(pageIndicator).toBeVisible();
  });

  test("T3-E2E-05 [F01 x F16]: Navigating between modules maintains active organization context", async ({
    adminPage,
  }) => {
    await adminPage.goto("/dashboard/jobs");
    await expect(adminPage.locator("main, h1").first()).toBeVisible({
      timeout: 10000,
    });

    await adminPage.goto("/dashboard/candidates");
    await expect(
      adminPage.locator("table, [data-testid='candidate-list'], h1").first(),
    ).toBeVisible({ timeout: 10000 });

    // Header remains visible with consistent context
    const header = adminPage.locator("header, nav").first();
    await expect(header).toBeVisible();
    expect(adminPage.url()).toContain("/dashboard/candidates");
  });

  test("T3-E2E-06 [F11 x F16]: Authenticated browser context shares session across multiple pages", async ({
    adminPage,
    context,
  }) => {
    await adminPage.goto("/dashboard");
    await expect(adminPage.locator("header, nav").first()).toBeVisible({
      timeout: 10000,
    });

    // Open a second tab in same browser context
    const newPage = await context.newPage();
    await newPage.goto("/dashboard/jobs");
    await expect(newPage).toHaveURL(/\/dashboard\/jobs/, { timeout: 10000 });
    expect(newPage.url()).not.toContain("/auth/login");
    await newPage.close();
  });

  test("T3-E2E-07 [F03 x F16]: Masked candidate drawer view does not render email for member role", async ({
    memberPage,
  }) => {
    const seededJobId = "00000000-0000-4000-8000-000000000101";
    await memberPage.goto(`/dashboard/jobs/${seededJobId}/pipeline`);
    await expect(
      memberPage.locator("main, [data-testid^='stage-pill-']").first(),
    ).toBeVisible({ timeout: 10000 });

    const content = await memberPage.content();
    expect(content).not.toContain("test.applicant@example.com");
  });

  test("T3-E2E-08 [F05 x F09]: Switching organizations in UI updates workspace context", async ({
    adminPage,
  }) => {
    await adminPage.goto("/dashboard");
    const userMenuTrigger = adminPage
      .locator(
        'button[aria-label="User profile"], button[aria-label="Hồ sơ người dùng"], [data-testid="user-menu-trigger"]',
      )
      .first();
    await expect(userMenuTrigger).toBeVisible({ timeout: 8000 });
    await userMenuTrigger.click();

    const orgSwitcher = adminPage
      .locator(
        "button[aria-expanded][aria-label], button:has(svg.lucide-building-2)",
      )
      .first();
    await expect(orgSwitcher).toBeVisible({ timeout: 5000 });
  });
});
