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
    const url = `/careers/demo/${slug}${refQuery ? `?ref=${refQuery}` : ""}`;
    const res = await this.page.goto(url, { waitUntil: "domcontentloaded" });
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
      if (await phoneInput.isVisible()) {
        await phoneInput.fill(candidate.phone);
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
    const alert = this.page.locator(
      "form [role='alert'], [role='alert'], text=/vượt quá|exceeds|invalid|bắt buộc|required/i",
    );
    await expect(alert.first()).toBeVisible({ timeout: 6000 });
    if (pattern) {
      const text = await alert.first().textContent();
      expect(text).toMatch(pattern);
    }
  }
}
