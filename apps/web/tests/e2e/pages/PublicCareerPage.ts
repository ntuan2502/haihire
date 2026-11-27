import { expect, type Page } from "@playwright/test";

export interface CandidateApplyData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export class PublicCareerPage {
  constructor(private readonly page: Page) {}

  async goto(
    slug = "senior-backend-engineer-nestjs-postgresql",
    refQuery?: string,
  ) {
    const url = `/careers/demo-1/${slug}${refQuery ? `?ref=${refQuery}` : ""}`;
    const res = await this.page.goto(url, { waitUntil: "domcontentloaded" });
    await this.page.waitForLoadState("networkidle").catch(() => undefined);
    await expect(
      this.page.locator("form, #career-email, h1").first(),
    ).toBeVisible({ timeout: 10000 });
    return res;
  }

  async fillApplication(candidate: CandidateApplyData) {
    const firstNameInput = this.page.locator(
      "#career-firstName, input[name='firstName']",
    );
    const lastNameInput = this.page.locator(
      "#career-lastName, input[name='lastName']",
    );

    await expect(firstNameInput).toBeVisible({ timeout: 10000 });
    await firstNameInput.fill(candidate.firstName);
    await lastNameInput.fill(candidate.lastName);

    const emailInput = this.page.locator(
      "#career-email, form input[type='email']",
    );
    await emailInput.fill(candidate.email);

    if (candidate.phone) {
      const phoneInput = this.page.locator(
        "#career-phone, form input[type='tel']",
      );
      await expect(phoneInput).toBeVisible();
      await phoneInput.fill(candidate.phone);
    }

    await this.fillRequiredScreeningQuestions();
  }

  async fillRequiredScreeningQuestions() {
    const questionBlocks = this.page.locator(
      "form div:has(> label[for^='career-q-'])",
    );
    const count = await questionBlocks.count();
    for (let i = 0; i < count; i++) {
      const block = questionBlocks.nth(i);
      const numInput = block.locator("input[type='number']");
      if ((await numInput.count()) > 0) {
        await numInput.first().fill("5");
        continue;
      }
      const dateInput = block.locator("input[type='date']");
      if ((await dateInput.count()) > 0) {
        await dateInput.first().fill("2026-06-01");
        continue;
      }
      const textarea = block.locator("textarea");
      if ((await textarea.count()) > 0) {
        await textarea
          .first()
          .fill(
            "Experienced with zero-downtime PostgreSQL migrations and BullMQ dead-letter queues.",
          );
        continue;
      }
      const radioInput = block.locator("input[type='radio']");
      if ((await radioInput.count()) > 0) {
        await radioInput.first().check();
        continue;
      }
      const checkboxInput = block.locator("input[type='checkbox']");
      if ((await checkboxInput.count()) > 0) {
        await checkboxInput.first().check();
        continue;
      }
      const textInput = block.locator("input");
      if ((await textInput.count()) > 0) {
        await textInput.first().fill("Sample screening answer");
      }
    }
  }

  async uploadResume(
    filename = "candidate-resume.pdf",
    mimeType = "application/pdf",
    content = Buffer.from("%PDF-1.4 sample resume content\n%%EOF"),
  ) {
    await this.page.setInputFiles("input[type='file']", {
      name: filename,
      mimeType,
      buffer: content,
    });
  }

  async submit() {
    await this.page.locator("form button[type='submit']").click();
  }

  async expectSuccess(timeoutMs = 12000) {
    const successTitle = this.page.locator(
      "text=/Application Submitted|Ứng tuyển thành công/i",
    );
    await expect(successTitle.first()).toBeVisible({ timeout: timeoutMs });
  }

  async expectValidationError(pattern?: RegExp) {
    const alert = this.page
      .locator(
        "form [role='alert'], [role='alert'], form p[class*='text-rose'], form p[class*='text-destructive']",
      )
      .or(
        this.page.getByText(
          /vượt quá|exceeds|invalid|hợp lệ|bắt buộc|required|định dạng|extension/i,
        ),
      );
    await expect(alert.first()).toBeVisible({ timeout: 6000 });
    if (pattern) {
      const text = await alert.first().textContent();
      expect(text).toMatch(pattern);
    }
  }
}
