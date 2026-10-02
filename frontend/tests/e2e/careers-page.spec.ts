import { test, expect } from "@playwright/test";

test.describe("E2E Flow 1: Careers Page & SEO Metadata Verification", () => {
  test("renders career job details without script warnings or hydration errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
      if (msg.type() === "warning") {
        consoleWarnings.push(text);
      }
    });

    const response = await page.goto("/careers/admin/senior-backend-engineer-nestjs-postgresql?ref=lnk-x-fresh-zero", {
      waitUntil: "networkidle",
    });

    expect(response?.status()).toBe(200);

    // 1. Verify <h1> contains the job title
    const heading = page.locator("h1");
    await expect(heading.first()).toBeVisible();
    const headingText = await heading.first().innerText();
    expect(headingText).toContain("Senior Backend Engineer");

    // 2. Verify OpenGraph meta tags in <head>
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toContain("Senior Backend Engineer");

    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute("content");
    expect(ogUrl).toContain("/careers/admin/senior-backend-engineer-nestjs-postgresql");

    const ogSiteName = await page.locator('meta[property="og:site_name"]').getAttribute("content");
    expect(ogSiteName).toBe("HaiHire Enterprise ATS");

    // 3. Verify JSON-LD Structured Data
    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);
    const jsonLdContent = await jsonLdScript.innerText();
    expect(jsonLdContent).toContain('"@type":"JobPosting"');
    expect(jsonLdContent).toContain("Senior Backend Engineer");

    // 4. Verify ZERO React 19 script tag warnings
    const scriptTagWarnings = [...consoleErrors, ...consoleWarnings].filter((msg) =>
      msg.includes("Encountered a script tag while rendering React component"),
    );
    expect(scriptTagWarnings.length).toBe(0);

    // 5. Verify ZERO React hydration mismatch warnings
    const hydrationWarnings = [...consoleErrors, ...consoleWarnings].filter((msg) =>
      msg.toLowerCase().includes("hydration"),
    );
    expect(hydrationWarnings.length).toBe(0);
  });
});
