import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateProdEmailProvider } from "./check-prod-email-provider.ts";

describe("CI Gate: check-prod-email-provider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should fail when NODE_ENV=production and SYSTEM_EMAIL_PROVIDER=SIMULATED", () => {
    const result = validateProdEmailProvider({
      nodeEnv: "production",
      provider: "SIMULATED",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(
      "SYSTEM_EMAIL_PROVIDER cannot be 'SIMULATED'",
    );
  });

  it("should pass when NODE_ENV=production and SYSTEM_EMAIL_PROVIDER=RESEND", () => {
    const result = validateProdEmailProvider({
      nodeEnv: "production",
      provider: "RESEND",
    });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("Production email provider check OK");
  });

  it("should pass when NODE_ENV=production and SYSTEM_EMAIL_PROVIDER=SMTP", () => {
    const result = validateProdEmailProvider({
      nodeEnv: "production",
      provider: "SMTP",
    });

    expect(result.ok).toBe(true);
  });

  it("should pass when NODE_ENV=production and SYSTEM_EMAIL_PROVIDER=SENDGRID", () => {
    const result = validateProdEmailProvider({
      nodeEnv: "production",
      provider: "SENDGRID",
    });

    expect(result.ok).toBe(true);
  });

  it("should pass when NODE_ENV=development and SYSTEM_EMAIL_PROVIDER=SIMULATED", () => {
    const result = validateProdEmailProvider({
      nodeEnv: "development",
      provider: "SIMULATED",
    });

    expect(result.ok).toBe(true);
  });

  it("should pass when NODE_ENV=test and SYSTEM_EMAIL_PROVIDER=SIMULATED", () => {
    const result = validateProdEmailProvider({
      nodeEnv: "test",
      provider: "SIMULATED",
    });

    expect(result.ok).toBe(true);
  });

  it("should read from process.env when options are omitted", () => {
    process.env.NODE_ENV = "production";
    process.env.SYSTEM_EMAIL_PROVIDER = "SIMULATED";

    const result = validateProdEmailProvider();
    expect(result.ok).toBe(false);

    process.env.SYSTEM_EMAIL_PROVIDER = "RESEND";
    const resultOk = validateProdEmailProvider();
    expect(resultOk.ok).toBe(true);
  });
});
