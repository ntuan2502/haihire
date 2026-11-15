import { expect, type Page } from "@playwright/test";

export class KanbanPipelinePage {
  constructor(private readonly page: Page) {}

  async goto(jobId: string, stage = "APPLIED") {
    await this.page.goto(`/dashboard/jobs/${jobId}/pipeline?stage=${stage}`);
    await expect(
      this.page.locator("main, [data-testid^='stage-pill-']").first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async dragCandidate(candidateId: string, fromStage: string, toStage: string) {
    await this.page.evaluate(
      ({ cardId, from, to }) => {
        const source = document.querySelector(
          `[data-testid="candidate-card-${cardId}"]`,
        );
        const target = document.querySelector(
          `[data-testid="stage-pill-${to}"]`,
        );
        if (!source || !target) {
          throw new Error(
            `Drag source or target not found: card=${cardId}, target=${to}`,
          );
        }

        const dt = new DataTransfer();
        dt.setData(
          "application/json",
          JSON.stringify({ id: cardId, stage: from }),
        );
        dt.setData("text/plain", cardId);

        source.dispatchEvent(
          new DragEvent("dragstart", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        );
        target.dispatchEvent(
          new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        );
        target.dispatchEvent(
          new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        );
        source.dispatchEvent(
          new DragEvent("dragend", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        );
      },
      { cardId: candidateId, from: fromStage, to: toStage },
    );
  }

  async expectCandidateInStage(candidateId: string, stage: string) {
    const stagePill = this.page.locator(`[data-testid="stage-pill-${stage}"]`);
    if (await stagePill.isVisible()) {
      await stagePill.click();
    }
    const candidateCard = this.page.locator(
      `[data-testid="candidate-card-${candidateId}"]`,
    );
    await expect(candidateCard).toBeVisible({ timeout: 10000 });
  }

  async expectToastError(pattern: RegExp) {
    const toast = this.page.locator(
      ".Toastify__toast, [role='alert'], [role='status']",
    );
    await expect(toast.first()).toBeVisible({ timeout: 6000 });
    const text = await toast.first().textContent();
    expect(text).toMatch(pattern);
  }
}
