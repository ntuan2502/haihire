import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StageSelector } from "./stage-selector";

// Mock i18n
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === "pipeline.tooltips.invalidTransition") {
        return `Không thể chuyển từ ${params?.from} sang ${params?.to}`;
      }
      if (key === "pipeline.tooltips.cannotMoveHired") {
        return `Ứng viên đã HIRED không thể quay lại ${params?.to}`;
      }
      if (key === "pipeline.tooltips.cannotMoveRejected") {
        return `Ứng viên đã REJECTED không thể chuyển sang ${params?.to}`;
      }
      if (key === "pipeline.switchStageHint") return "Chuyển giai đoạn...";
      if (key.startsWith("pipeline.stages.")) {
        const parts = key.split(".");
        return parts[parts.length - 1].toUpperCase();
      }
      return key;
    },
  }),
}));

describe("StageSelector Component", () => {
  describe("Dropdown Variant (C2 Acceptance Criteria)", () => {
    it("excludes APPLIED from dropdown options when currentStage is SCREENING", () => {
      const onSelectStage = vi.fn();
      render(
        <StageSelector
          currentStage="SCREENING"
          onSelectStage={onSelectStage}
          variant="dropdown"
        />,
      );

      // Verify dropdown select is present
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();

      // Check all option values inside select
      const options = screen.getAllByRole("option");
      const values = options.map((opt) => (opt as HTMLOptionElement).value);

      // Must not contain APPLIED or SCREENING
      expect(values).not.toContain("APPLIED");
      expect(values).not.toContain("SCREENING");

      // Must contain valid next stages: INTERVIEW, REJECTED
      expect(values).toContain("INTERVIEW");
      expect(values).toContain("REJECTED");
    });

    it("triggers onSelectStage when selecting a valid next stage", () => {
      const onSelectStage = vi.fn();
      render(
        <StageSelector
          currentStage="SCREENING"
          onSelectStage={onSelectStage}
          variant="dropdown"
        />,
      );

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "INTERVIEW" } });

      expect(onSelectStage).toHaveBeenCalledTimes(1);
      expect(onSelectStage).toHaveBeenCalledWith("INTERVIEW");
    });
  });

  describe("Buttons Variant (A3 & A4 UI Prevention & Tooltips)", () => {
    it("disables invalid stage buttons and sets explanatory tooltips", () => {
      const onSelectStage = vi.fn();
      render(
        <StageSelector
          currentStage="SCREENING"
          onSelectStage={onSelectStage}
          variant="buttons"
        />,
      );

      // APPLIED button should be disabled with tooltip
      const buttons = screen.getAllByRole("button");
      const appliedButton = buttons.find((btn) =>
        btn.textContent?.includes("New") || btn.textContent?.includes("APPLIED"),
      );

      expect(appliedButton).toBeDefined();
      expect(appliedButton).toBeDisabled();
      expect(appliedButton).toHaveAttribute(
        "title",
        "Không thể chuyển từ SCREENING sang APPLIED",
      );

      // Clicking disabled invalid stage button does NOT trigger callback
      if (appliedButton) {
        fireEvent.click(appliedButton);
      }
      expect(onSelectStage).not.toHaveBeenCalled();
    });

    it("enables valid next stage buttons and executes onSelectStage when clicked", () => {
      const onSelectStage = vi.fn();
      render(
        <StageSelector
          currentStage="SCREENING"
          onSelectStage={onSelectStage}
          variant="buttons"
        />,
      );

      const buttons = screen.getAllByRole("button");
      const interviewButton = buttons.find((btn) =>
        btn.textContent?.includes("Interview") || btn.textContent?.includes("INTERVIEW"),
      );

      expect(interviewButton).toBeDefined();
      expect(interviewButton).not.toBeDisabled();

      if (interviewButton) {
        fireEvent.click(interviewButton);
      }
      expect(onSelectStage).toHaveBeenCalledTimes(1);
      expect(onSelectStage).toHaveBeenCalledWith("INTERVIEW");
    });

    it("disables all buttons when candidate is in terminal HIRED stage", () => {
      const onSelectStage = vi.fn();
      render(
        <StageSelector
          currentStage="HIRED"
          onSelectStage={onSelectStage}
          variant="buttons"
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((btn) => {
        expect(btn).toBeDisabled();
        expect(btn.getAttribute("title")).toContain("HIRED không thể quay lại");
      });

      // Clicking any button does NOT trigger callback
      fireEvent.click(buttons[0]);
      expect(onSelectStage).not.toHaveBeenCalled();
    });
  });
});
