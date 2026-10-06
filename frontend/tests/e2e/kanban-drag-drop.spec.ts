import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "admin@tun.io.vn";
const DEMO_PASSWORD =
  process.env.DEMO_SEED_PASSWORD ||
  process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
  "dev-seed-password-2026";

test.describe("Kanban Drag and Drop E2E Flow", () => {
  test("drag APPLIED -> SCREENING succeeds, drag SCREENING -> APPLIED triggers toast error and blocks API", async ({
    page,
  }) => {
    // 1. Login to obtain session
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    await page.locator('input[type="email"]').fill(DEMO_EMAIL);
    await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 2. Discover an active job pipeline with candidates in APPLIED stage
    const pipelineLinks = page.locator('a[href*="/pipeline"]');
    await expect(pipelineLinks.first()).toBeVisible({ timeout: 10000 });
    const hrefs = await pipelineLinks.evaluateAll((links) =>
      links.map((a) => (a as HTMLAnchorElement).pathname),
    );

    let candidateCardFound = false;
    for (const href of hrefs) {
      if (!href) continue;
      await page.goto(`${href}?stage=APPLIED`);
      await page.waitForLoadState("networkidle");

      const candidateCard = page.locator('[data-testid^="candidate-card-"]').first();
      if (await candidateCard.isVisible({ timeout: 4000 }).catch(() => false)) {
        candidateCardFound = true;
        break;
      }
    }
    expect(candidateCardFound).toBe(true);

    // Ensure stage pill for APPLIED and SCREENING are visible
    const appliedPill = page.locator('[data-testid="stage-pill-APPLIED"]');
    const screeningPill = page.locator('[data-testid="stage-pill-SCREENING"]');
    await expect(appliedPill).toBeVisible({ timeout: 10000 });
    await expect(screeningPill).toBeVisible({ timeout: 10000 });

    // Find candidate card in APPLIED stage
    const candidateCard = page.locator('[data-testid^="candidate-card-"]').first();
    await expect(candidateCard).toBeVisible({ timeout: 10000 });

    const cardTestId = await candidateCard.getAttribute("data-testid");
    expect(cardTestId).toBeTruthy();
    const candidateId = cardTestId!.replace("candidate-card-", "");

    // Monitor API network requests to detect stage update calls
    const apiStageUpdates: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      const method = req.method();
      if ((method === "PATCH" || method === "PUT" || method === "POST") && url.includes("/stage")) {
        apiStageUpdates.push(`${method} ${url}`);
      }
    });

    // 3. Test VALID transition: APPLIED -> SCREENING via HTML5 drag-and-drop
    await page.evaluate(
      ({ cardId, fromStage, toStage }) => {
        const source = document.querySelector(`[data-testid="candidate-card-${cardId}"]`);
        const target = document.querySelector(`[data-testid="stage-pill-${toStage}"]`);
        if (!source || !target) {
          throw new Error(`Drag source or target not found: ${cardId}`);
        }

        const dt = new DataTransfer();
        dt.setData(
          "application/json",
          JSON.stringify({ id: cardId, stage: fromStage }),
        );
        dt.setData("text/plain", cardId);

        source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
        source.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer: dt }));
      },
      { cardId: candidateId, fromStage: "APPLIED", toStage: "SCREENING" },
    );

    // Wait for the mutation to settle (URL changes or API request recorded)
    await page.waitForTimeout(1000);
    expect(apiStageUpdates.length).toBeGreaterThanOrEqual(1);

    // 4. Switch to SCREENING stage tab and find the moved candidate
    await screeningPill.click();
    await page.waitForTimeout(500);

    const candidateInScreening = page.locator(`[data-testid="candidate-card-${candidateId}"]`);
    await expect(candidateInScreening).toBeVisible({ timeout: 10000 });

    // Clear recorded API stage updates before testing invalid transition
    const countBeforeInvalid = apiStageUpdates.length;

    // 5. Test INVALID transition: SCREENING -> APPLIED (prohibited by state machine)
    await page.evaluate(
      ({ cardId, fromStage, toStage }) => {
        const source = document.querySelector(`[data-testid="candidate-card-${cardId}"]`);
        const target = document.querySelector(`[data-testid="stage-pill-${toStage}"]`);
        if (!source || !target) {
          throw new Error(`Drag source or target not found for invalid transition`);
        }

        const dt = new DataTransfer();
        dt.setData(
          "application/json",
          JSON.stringify({ id: cardId, stage: fromStage }),
        );
        dt.setData("text/plain", cardId);

        source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
        source.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer: dt }));
      },
      { cardId: candidateId, fromStage: "SCREENING", toStage: "APPLIED" },
    );

    // 6. Verify toast error appears
    const toastLocator = page.locator("[data-sonner-toast], [role='status'], .toaster");
    await expect(toastLocator.first()).toBeVisible({ timeout: 5000 });
    const toastText = await toastLocator.first().textContent();
    expect(toastText).toMatch(/Không thể chuyển|Cannot move|Cannot transition/i);

    // 7. Verify API NOT called for invalid transition
    await page.waitForTimeout(500);
    expect(apiStageUpdates.length).toBe(countBeforeInvalid);
  });
});
