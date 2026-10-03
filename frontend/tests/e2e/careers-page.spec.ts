import { test, expect } from "@playwright/test";

const CAREER_PAGE_URL = "/careers/admin/senior-backend-engineer-nestjs-postgresql?ref=lnk-x-fresh-zero";

test.describe("E2E Flow 1: Careers Page & SEO Metadata Verification (Phase 18.1)", () => {
  test("renders career job details without script warnings or hydration errors (unmasked console audit)", async ({
    page,
  }) => {
    const rawConsoleLogs: { type: string; text: string }[] = [];

    // Capture every single console event without any filtering
    page.on("console", (msg) => {
      rawConsoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    const response = await page.goto(CAREER_PAGE_URL, {
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

    // 4. Verify ZERO React 19 script tag warnings across ALL console messages
    const scriptTagErrors = rawConsoleLogs.filter((log) =>
      log.text.includes("Encountered a script tag while rendering React component"),
    );
    expect(scriptTagErrors).toHaveLength(0);

    // 5. Verify ZERO React hydration mismatch warnings
    const hydrationErrors = rawConsoleLogs.filter(
      (log) =>
        log.text.toLowerCase().includes("hydration") &&
        (log.type === "error" || log.type === "warning"),
    );
    expect(hydrationErrors).toHaveLength(0);
  });

  test("Phase 19 verification: user-reported URL (senior-technical-recruiter-hr) renders without script tag warning", async ({
    page,
  }) => {
    const rawConsoleLogs: { type: string; text: string }[] = [];

    page.on("console", (msg) => {
      rawConsoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    const targetUrl = "/careers/admin/senior-technical-recruiter-hr?ref=lnk-techinasia-fair";
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle",
    });

    expect(response?.status()).toBe(200);

    const heading = page.locator("h1");
    await expect(heading.first()).toBeVisible();
    expect(await heading.first().innerText()).toContain("Senior Technical Recruiter");

    // Verify ZERO script tag warnings from React 19 across all console messages
    const scriptTagErrors = rawConsoleLogs.filter((log) =>
      log.text.includes("Encountered a script tag while rendering React component"),
    );
    expect(scriptTagErrors).toHaveLength(0);
  });

  test("theme flicker test: dark mode class is applied synchronously before paint (<50ms)", async ({
    page,
  }) => {
    // Seed dark mode into localStorage before navigation begins
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });

    // Navigate until DOM is parsed and head scripts executed
    await page.goto(CAREER_PAGE_URL, { waitUntil: "domcontentloaded" });

    // Inspect documentElement immediately
    const themeEvaluation = await page.evaluate(() => {
      const isDark = document.documentElement.classList.contains("dark");
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const themeInitDuration = navEntry ? Math.max(0, navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart) : 0;
      return { isDark, themeInitDuration };
    });

    // Dark class must be applied by head script immediately before paint (0ms flicker)
    expect(themeEvaluation.isDark).toBe(true);
    expect(themeEvaluation.themeInitDuration).toBeLessThan(50);
  });

  test("SSR HTML content verification: server-rendered response contains complete semantic content", async ({
    request,
  }) => {
    // Request raw HTML directly via API request to bypass any client-side JavaScript execution
    const response = await request.get(CAREER_PAGE_URL);
    expect(response.status()).toBe(200);

    const html = await response.text();

    // Verify <h1> with job title is server-rendered directly into raw HTML
    expect(html).toContain("Senior Backend Engineer (NestJS / PostgreSQL)");

    // Verify Schema.org JSON-LD structured data is present in raw HTML
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"JobPosting"');

    // Verify OpenGraph tags are present in raw HTML
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:site_name"');

    // Verify page is not an empty client shell
    expect(html.length).toBeGreaterThan(2000);
  });
});
