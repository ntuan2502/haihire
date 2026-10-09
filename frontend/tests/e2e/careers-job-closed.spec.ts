import { test, expect } from "@playwright/test";

test.describe("E2E: Careers Job Status Handling & React 19 Script Warning Fix (Task #13)", () => {
  test("Case 1: PUBLISHED job renders job details with 200 OK and ZERO script warnings", async ({
    page,
  }) => {
    const rawConsoleLogs: { type: string; text: string }[] = [];

    page.on("console", (msg) => {
      rawConsoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    const response = await page.goto(
      "/careers/admin/senior-backend-engineer-nestjs-postgresql",
      { waitUntil: "networkidle" },
    );

    expect(response?.status()).toBe(200);

    // Verify <h1> has job title
    const heading = page.locator("h1");
    await expect(heading.first()).toBeVisible();
    expect(await heading.first().innerText()).toContain("Senior Backend Engineer");

    // Verify apply button is present
    const applyButton = page.getByRole("button", { name: /ứng tuyển ngay|apply now/i });
    await expect(applyButton.first()).toBeVisible();

    // Verify ZERO React 19 script tag warnings
    const scriptWarnings = rawConsoleLogs.filter((log) =>
      log.text.includes("Encountered a script tag while rendering React component"),
    );
    expect(scriptWarnings).toHaveLength(0);
  });

  test("Case 2: CLOSED job renders JobClosed page with 200 OK and ZERO script warnings", async ({
    page,
  }) => {
    const rawConsoleLogs: { type: string; text: string }[] = [];

    // Capture all console events
    page.on("console", (msg) => {
      rawConsoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    const targetUrl = "/careers/admin/information-security-secops-specialist";
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle",
    });

    // Semantic status: CLOSED job returns 200 OK with dedicated notice page, not 404
    expect(response?.status()).toBe(200);

    // Verify heading contains job title
    const heading = page.locator("h1");
    await expect(heading.first()).toBeVisible();
    expect(await heading.first().innerText()).toContain("Information Security & SecOps Specialist");

    // Verify closed notice badge or text
    const closedBadge = page.getByText(/vị trí này đã đóng|this position is closed/i);
    await expect(closedBadge.first()).toBeVisible();

    // Verify link to view other jobs at the organization exists
    const viewOtherLink = page.getByRole("link", { name: /xem các vị trí khác|view other positions/i });
    await expect(viewOtherLink.first()).toBeVisible();
    await expect(viewOtherLink.first()).toHaveAttribute("href", "/careers/admin");

    // CRITICAL ACCEPTANCE CRITERIA: Verify ZERO React 19 script tag warnings
    const scriptWarnings = rawConsoleLogs.filter((log) =>
      log.text.includes("Encountered a script tag while rendering React component"),
    );
    expect(scriptWarnings).toHaveLength(0);
  });

  test("Case 3: DRAFT job returns 404 Not Found", async ({ page }) => {
    const response = await page.goto(
      "/careers/admin/customer-success-lead-enterprise-tier-1",
      { waitUntil: "networkidle" },
    );

    // DRAFT jobs must not be accessible to public visitors
    expect(response?.status()).toBe(404);
  });

  test("Case 4: Non-existent job slug returns 404 Not Found", async ({ page }) => {
    const response = await page.goto(
      "/careers/admin/non-existent-career-opening-slug-404",
      { waitUntil: "networkidle" },
    );

    expect(response?.status()).toBe(404);
  });
});
