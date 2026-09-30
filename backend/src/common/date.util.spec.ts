import { describe, it, expect } from "vitest";
import { toTimestamp, toInstant } from "./date.util";

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

describe("toInstant", () => {
  it("should convert Date to Temporal.Instant", () => {
    const d = new Date("2026-09-21T12:00:00.000Z");
    const inst = toInstant(d);
    expect(inst.epochMilliseconds).toBe(d.getTime());
  });

  it("should convert timestamp number to Temporal.Instant", () => {
    const ts = 1789948800000;
    const inst = toInstant(ts);
    expect(inst.epochMilliseconds).toBe(ts);
  });

  it("should default to current time when called without arguments", () => {
    const before = Date.now();
    const inst = toInstant();
    const after = Date.now();
    expect(inst.epochMilliseconds).toBeGreaterThanOrEqual(before);
    expect(inst.epochMilliseconds).toBeLessThanOrEqual(after);
  });
});
