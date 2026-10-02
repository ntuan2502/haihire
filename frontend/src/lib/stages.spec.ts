import { describe, it, expect } from "vitest";
import { STAGES_ORDER, STAGE_CONFIG_MAP } from "./stages";

describe("Stages Configuration", () => {
  it("defines all standard ATS pipeline stages in order", () => {
    expect(STAGES_ORDER).toEqual([
      "APPLIED",
      "SCREENING",
      "INTERVIEW",
      "OFFER",
      "HIRED",
      "REJECTED",
    ]);
  });

  it("contains config for every stage in STAGES_ORDER", () => {
    for (const stage of STAGES_ORDER) {
      const config = STAGE_CONFIG_MAP[stage];
      expect(config).toBeDefined();
      expect(config.id).toBe(stage);
      expect(config.label).toBeTruthy();
      expect(config.dotColor).toBeTruthy();
      expect(config.badgeBg).toBeTruthy();
    }
  });
});

describe("Application Stage State Machine (canTransition)", () => {
  it("allows transition from APPLIED to SCREENING (true)", async () => {
    const { canTransition } = await import("./stages");
    expect(canTransition("APPLIED", "SCREENING")).toBe(true);
  });

  it("blocks direct skip from APPLIED to HIRED (false)", async () => {
    const { canTransition } = await import("./stages");
    expect(canTransition("APPLIED", "HIRED")).toBe(false);
  });

  it("blocks backward transition from SCREENING to APPLIED (false)", async () => {
    const { canTransition } = await import("./stages");
    expect(canTransition("SCREENING", "APPLIED")).toBe(false);
  });

  it("blocks transition from terminal HIRED stage to APPLIED (false)", async () => {
    const { canTransition } = await import("./stages");
    expect(canTransition("HIRED", "APPLIED")).toBe(false);
    expect(canTransition("HIRED", "INTERVIEW")).toBe(false);
  });

  it("blocks transition from terminal REJECTED stage to OFFER (false)", async () => {
    const { canTransition } = await import("./stages");
    expect(canTransition("REJECTED", "OFFER")).toBe(false);
    expect(canTransition("REJECTED", "SCREENING")).toBe(false);
  });

  it("allows no-op same-stage transition (true)", async () => {
    const { canTransition } = await import("./stages");
    expect(canTransition("APPLIED", "APPLIED")).toBe(true);
    expect(canTransition("SCREENING", "SCREENING")).toBe(true);
    expect(canTransition("INTERVIEW", "INTERVIEW")).toBe(true);
    expect(canTransition("OFFER", "OFFER")).toBe(true);
    expect(canTransition("HIRED", "HIRED")).toBe(true);
    expect(canTransition("REJECTED", "REJECTED")).toBe(true);
  });

  it("returns false for null or undefined stages", async () => {
    const { canTransition } = await import("./stages");
    expect(canTransition(null, "APPLIED")).toBe(false);
    expect(canTransition("APPLIED", null)).toBe(false);
    expect(canTransition(undefined, undefined)).toBe(false);
  });

  it("generates descriptive reasons for disabled transitions", async () => {
    const { getTransitionDisabledReason } = await import("./stages");
    const mockT = (key: string, params?: Record<string, string | number>) => {
      if (key === "pipeline.tooltips.cannotMoveHired") {
        return `Ứng viên đã HIRED không thể quay lại ${params?.to}`;
      }
      if (key === "pipeline.tooltips.cannotMoveRejected") {
        return `Ứng viên đã REJECTED không thể chuyển sang ${params?.to}`;
      }
      if (key === "pipeline.tooltips.invalidTransition") {
        return `Không thể chuyển từ ${params?.from} sang ${params?.to}`;
      }
      return key;
    };

    expect(getTransitionDisabledReason("HIRED", "APPLIED", mockT)).toContain("HIRED không thể quay lại APPLIED");
    expect(getTransitionDisabledReason("REJECTED", "OFFER", mockT)).toContain("REJECTED không thể chuyển sang OFFER");
    expect(getTransitionDisabledReason("SCREENING", "APPLIED", mockT)).toContain("Không thể chuyển từ SCREENING sang APPLIED");
    expect(getTransitionDisabledReason("APPLIED", "APPLIED", mockT)).toBe("");
  });
});

