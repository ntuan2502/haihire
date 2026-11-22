import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures/auth-fixtures";

test.describe("Candidate Duplicate Detection E2E Flow", () => {
  const createdIds: string[] = [];

  test.afterEach(async ({ adminPage }) => {
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id) {
        await adminPage.request.delete(`/api/candidates/${id}`).catch(() => {});
      }
    }
  });

  test("enforces blocking email duplicates and soft phone warnings across Create, Detail, and Edit", async ({
    adminPage,
  }) => {
    const uniqueSuffix = randomUUID().slice(0, 8);
    const baseEmail = `e2e-dup-base-${uniqueSuffix}@example.com`;
    // Generate deterministic 10-digit VN local number: 09 + 8 random digits
    const random8 = String(Math.floor(10000000 + Math.random() * 89999999));
    const basePhoneLocal = `09${random8}`;
    const localWithoutZero = basePhoneLocal.slice(1);
    const reformattedIntlPhone = `+84 ${localWithoutZero.slice(0, 3)}-${localWithoutZero.slice(3, 6)}-${localWithoutZero.slice(6)}`;

    // 1. Seed a base active candidate via API
    const createRes = await adminPage.request.post("/api/candidates", {
      data: {
        firstName: "Base",
        lastName: "DuplicateCheck",
        email: baseEmail,
        phone: basePhoneLocal,
      },
    });
    expect(createRes.status()).toBe(201);
    const baseCandidate = (await createRes.json()) as { id: string };
    createdIds.push(baseCandidate.id);

    // 2. Navigate to /candidates/new: test BLOCKING email duplicate
    await adminPage.goto("/candidates/new");
    await adminPage.waitForLoadState("networkidle").catch(() => undefined);

    const emailInput = adminPage.locator('form input[type="email"]').first();
    const phoneInput = adminPage.locator('form input[type="tel"]').first();
    const submitBtn = adminPage.locator('form button[type="submit"]').first();
    const requiredTextInputs = adminPage.locator(
      'form input[required]:not([type="email"])',
    );

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await requiredTextInputs.nth(0).fill("E2E");
    await requiredTextInputs.nth(1).fill("Candidate Two");
    await emailInput.fill(baseEmail);

    const blockingAlert = adminPage.getByTestId(
      "candidate-duplicate-blocking-alert",
    );
    await expect(blockingAlert).toBeVisible({ timeout: 8000 });
    await expect(
      blockingAlert.locator(`a[href="/candidates/${baseCandidate.id}"]`),
    ).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // 3. Switch to fresh email + reformatted +84 phone: WARNING alert allows creation
    const secondEmail = `e2e-dup-second-${uniqueSuffix}@example.com`;
    await emailInput.fill(secondEmail);
    await phoneInput.fill(reformattedIntlPhone);

    await expect(blockingAlert).toBeHidden({ timeout: 8000 });
    const warningAlert = adminPage.getByTestId(
      "candidate-duplicate-warning-alert",
    );
    await expect(warningAlert).toBeVisible({ timeout: 8000 });
    await expect(
      warningAlert.locator(`a[href="/candidates/${baseCandidate.id}"]`),
    ).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    const createResponsePromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes("/api/candidates") &&
        res.request().method() === "POST",
      { timeout: 15000 },
    );
    await submitBtn.click();
    const createUiRes = await createResponsePromise;
    expect(createUiRes.status()).toBe(201);
    const createdCandidate = (await createUiRes.json()) as { id: string };
    createdIds.push(createdCandidate.id);

    await adminPage.waitForURL(/\/candidates$/, { timeout: 10000 });

    // 4. Open second candidate detail page -> suspected-duplicate warning banner renders
    await adminPage.goto(`/candidates/${createdCandidate.id}`);
    await expect(warningAlert).toBeVisible({ timeout: 10000 });
    await expect(
      warningAlert.locator(`a[href="/candidates/${baseCandidate.id}"]`),
    ).toBeVisible();

    // 5. Open /candidates/<id>/edit and change email back to baseEmail -> blocking alert + disabled Save
    await adminPage.goto(`/candidates/${createdCandidate.id}/edit`);
    const editEmailInput = adminPage
      .locator('form input[type="email"]')
      .first();
    await expect(editEmailInput).toHaveValue(secondEmail, { timeout: 10000 });
    await editEmailInput.fill(baseEmail);

    await expect(blockingAlert).toBeVisible({ timeout: 8000 });
    await expect(
      adminPage.locator('form button[type="submit"]').first(),
    ).toBeDisabled();
  });
});
