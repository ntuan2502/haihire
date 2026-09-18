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
