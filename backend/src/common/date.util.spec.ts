import { describe, it, expect } from "vitest";
import { toTimestamp } from "./date.util";

describe("toTimestamp", () => {
  it("should handle null and undefined", () => {
    expect(toTimestamp(null)).toBe(0);
    expect(toTimestamp(undefined)).toBe(0);
    expect(toTimestamp("")).toBe(0);
  });

  it("should handle Date instances", () => {
    const d = new Date("2026-09-21T00:00:00.000Z");
    expect(toTimestamp(d)).toBe(d.getTime());
  });

  it("should handle ISO string", () => {
    const iso = "2026-09-21T00:00:00.000Z";
    expect(toTimestamp(iso)).toBe(new Date(iso).getTime());
  });

  it("should handle Temporal.Instant objects without calling valueOf", () => {
    const mockInstant = {
      epochMilliseconds: 1789948800000,
      valueOf() {
        throw new TypeError("Do not use Temporal.Instant.prototype.valueOf; use Temporal.Instant.prototype.compare for comparison.");
      },
    };
    expect(toTimestamp(mockInstant)).toBe(1789948800000);
  });
});
