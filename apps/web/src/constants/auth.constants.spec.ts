import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isDemoLoginEnabled,
  resetWarnedMissingDemoPassword,
} from "./auth.constants";

describe("auth.constants - isDemoLoginEnabled Double Gate", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetWarnedMissingDemoPassword();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false when NEXT_PUBLIC_ENABLE_DEMO_LOGIN is not 'true'", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "false";
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD = "test-password";

    expect(isDemoLoginEnabled()).toBe(false);
  });

  it("returns false when NODE_ENV is 'production' even if flag is 'true' (double gate)", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD = "test-password";

    expect(isDemoLoginEnabled()).toBe(false);
  });

  it("returns false and logs console.warn once when password is missing", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(isDemoLoginEnabled()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("NEXT_PUBLIC_DEMO_SEED_PASSWORD is not set"),
    );

    // Second call should NOT log again
    expect(isDemoLoginEnabled()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("returns true when enabled, non-production, and password present", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD = "secure-dev-password";

    expect(isDemoLoginEnabled()).toBe(true);
  });
});
