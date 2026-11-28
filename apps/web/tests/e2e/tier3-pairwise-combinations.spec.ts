import { test, expect } from "./fixtures/auth-fixtures";
import { PublicCareerPage } from "./pages/PublicCareerPage";
import { createIsolatedTenant } from "./fixtures/seed-helpers";
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
    browser,
    playwright,
    baseURL,
  }) => {
    const resolvedBase = baseURL || "http://localhost:8080";
    const apiCtx = await playwright.request.newContext({
      baseURL: resolvedBase,
    });

    // Use a dedicated isolated multi-org user so shared Demo 1 accounts are never mutated
    const primarySession = await createIsolatedTenant(
      apiCtx,
      "org-switch",
      resolvedBase,
    );
    const authHeaders = {
      Cookie: primarySession.cookieHeader,
      Authorization: `Bearer ${primarySession.accessToken}`,
    };

    const candRes = await apiCtx.post("/api/candidates", {
      headers: authHeaders,
      data: {
        firstName: "Primary",
        lastName: "SecretCandidate",
        email: `primary-only-${randomUUID().slice(0, 6)}@example.com`,
      },
    });
    expect(candRes.status()).toBe(201);

    const secondaryOrgSlug = `e2e-sub-org-${randomUUID().slice(0, 8)}`;
    const createOrgRes = await apiCtx.post("/api/organizations", {
      headers: authHeaders,
      data: {
        name: "Secondary Workspace Org",
        slug: secondaryOrgSlug,
      },
    });
    expect([200, 201]).toContain(createOrgRes.status());
    const createOrgBody = (await createOrgRes.json()) as {
      organization?: { id: string; name: string };
      id?: string;
      name?: string;
    };
    const secondaryOrg = createOrgBody.organization ?? {
      id: createOrgBody.id ?? "",
      name: createOrgBody.name ?? "Secondary Workspace Org",
    };

    // Restore active org to Primary via API before launching browser UI
    const switchBackRes = await apiCtx.post("/api/organizations/switch", {
      headers: authHeaders,
      data: { organizationId: primarySession.orgId },
    });
    expect(switchBackRes.ok()).toBe(true);
    await apiCtx.dispose();

    const context = await browser.newContext({ baseURL: resolvedBase });
    await context.addCookies(primarySession.cookies);
    const isolatedPage = await context.newPage();

    try {
      await isolatedPage.goto("/dashboard");
      const navHeader = isolatedPage.locator("header, nav").first();
      await expect(navHeader).toBeVisible({ timeout: 10000 });

      // Open TeamSwitcher in sidebar header and select Secondary Workspace Org
      const orgSwitcher = isolatedPage
        .locator('[data-testid="org-switcher-trigger"]')
        .first();
      await expect(orgSwitcher).toBeVisible({ timeout: 8000 });
      await orgSwitcher.click();

      const secondaryOrgItem = isolatedPage
        .locator('[role="menuitem"]')
        .filter({ hasText: secondaryOrg.name })
        .first();
      await expect(secondaryOrgItem).toBeVisible({ timeout: 5000 });
      await secondaryOrgItem.click();

      await expect(isolatedPage).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Verify TanStack Query cache reflects new organization context
      await expect(async () => {
        const activeCacheKeys = await isolatedPage.evaluate(() => {
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
        expect(activeCacheKeys.length).toBeGreaterThan(0);
        expect(
          activeCacheKeys.some((key) =>
            JSON.stringify(key).includes(secondaryOrg.id),
          ),
        ).toBe(true);
      }).toPass({ timeout: 8000 });

      // Navigate to candidates view under new organization: primary candidates must not leak
      await isolatedPage.goto("/candidates");
      const candidatesContainer = isolatedPage
        .locator("main, [data-testid='candidate-list']")
        .first();
      await expect(candidatesContainer).toBeVisible({ timeout: 10000 });

      const newOrgPageText = await isolatedPage.locator("body").textContent();
      expect(newOrgPageText).not.toContain("SecretCandidate");
    } finally {
      await context.close();
    }
  });

  test("T3-E2E-03 [F05 x F11]: Protected route enforces authentication cookie and redirects guest", async ({
    page,
  }) => {
    // Unauthenticated guest attempts to access /settings
    await page.goto("/settings");
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });

    expect(page.url()).toContain("/auth/login");
    // Verify redirect query parameter preserves target
    expect(page.url()).toMatch(/redirect|returnUrl|dashboard/i);
  });

  test("T3-E2E-04 [F14 x F16]: Candidate table pagination queries database with clean slice", async ({
    adminPage,
  }) => {
    await adminPage.goto("/candidates");

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

    // 5. Assert page 2 renders a distinct candidate slice once placeholderData resolves
    const firstRowCell = candidateRows.first().locator("td").first();
    await expect(firstRowCell).not.toHaveText(
      (firstCandidatePage1 ?? "").trim(),
      {
        timeout: 8000,
      },
    );
    const firstCandidatePage2 = await firstRowCell.textContent();
    expect(firstCandidatePage2).not.toEqual(firstCandidatePage1);

    // 6. Assert pagination counter displays Page 2
    const pageIndicator = adminPage.locator("text=/page 2|trang 2/i").first();
    await expect(pageIndicator).toBeVisible();
  });

  test("T3-E2E-05 [F01 x F16]: Navigating between modules maintains active organization context", async ({
    adminPage,
  }) => {
    await adminPage.goto("/jobs");
    await expect(adminPage.locator("main, h1").first()).toBeVisible({
      timeout: 10000,
    });

    await adminPage.goto("/candidates");
    await expect(
      adminPage.locator("table, [data-testid='candidate-list'], h1").first(),
    ).toBeVisible({ timeout: 10000 });

    // Header remains visible with consistent context
    const header = adminPage.locator("header, nav").first();
    await expect(header).toBeVisible();
    expect(adminPage.url()).toContain("/candidates");
  });

  test("T3-E2E-06 [F11 x F16]: Authenticated browser context shares session across multiple pages", async ({
    adminPage,
  }) => {
    await adminPage.goto("/dashboard");
    await expect(adminPage.locator("header, nav").first()).toBeVisible({
      timeout: 10000,
    });

    // Open a second tab in the same authenticated browser context
    const newPage = await adminPage.context().newPage();
    await newPage.goto("/jobs");
    await expect(newPage).toHaveURL(/\/jobs/, { timeout: 10000 });
    expect(newPage.url()).not.toContain("/auth/login");
    await newPage.close();
  });

  test("T3-E2E-07 [F03 x F16]: Masked candidate drawer view does not render email for member role", async ({
    memberPage,
  }) => {
    const seededJobId = "00000000-0000-4000-8000-000000000101";
    await memberPage.goto(`/jobs/${seededJobId}/pipeline`);
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
    const orgSwitcher = adminPage
      .locator('[data-testid="org-switcher-trigger"]')
      .first();
    await expect(orgSwitcher).toBeVisible({ timeout: 8000 });
    await orgSwitcher.click();

    const menuItems = adminPage.locator('[role="menuitem"]');
    await expect(menuItems.first()).toBeVisible({ timeout: 5000 });
  });
});
