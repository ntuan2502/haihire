import { describe, expect, it } from "vitest";
import { backendEnvSchema } from "./env";

describe("backendEnvSchema production guards", () => {
  const baseProdEnv = {
    NODE_ENV: "production",
    PORT: "3001",
    DATABASE_URL: "postgresql://user:pass@postgres:5432/haihire?schema=public",
    JWT_SECRET: "super-secret-jwt-token-at-least-16-chars",
    ENCRYPTION_SECRET: "0123456789abcdef0123456789abcdef",
    FRONTEND_URL: "https://ats.example.com",
    MINIO_ENDPOINT: "minio",
    MINIO_PORT: "9000",
    MINIO_USE_SSL: "false",
    MINIO_ACCESS_KEY: "minioadmin",
    MINIO_SECRET_KEY: "minioadmin",
    MINIO_BUCKET_NAME: "haihire-resumes",
    MINIO_PUBLIC_URL: "https://s3.example.com",
    SYSTEM_EMAIL_PROVIDER: "RESEND",
    SYSTEM_EMAIL_FROM_NAME: "HaiHire",
    SYSTEM_EMAIL_FROM_EMAIL: "noreply@example.com",
    SYSTEM_EMAIL_SMTP_HOST: "",
    SYSTEM_EMAIL_SMTP_PORT: "587",
    SYSTEM_EMAIL_SMTP_USER: "",
    SYSTEM_EMAIL_SMTP_PASS: "",
    SYSTEM_EMAIL_RESEND_API_KEY: "re_test_123",
    SYSTEM_EMAIL_SENDGRID_API_KEY: "",
    SEED_DEMO_ON_BOOT: "false",
  };

  it("rejects SYSTEM_EMAIL_PROVIDER=SIMULATED when NODE_ENV=production", () => {
    const result = backendEnvSchema.safeParse({
      ...baseProdEnv,
      SYSTEM_EMAIL_PROVIDER: "SIMULATED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.path.includes("SYSTEM_EMAIL_PROVIDER"),
        ),
      ).toBe(true);
    }
  });

  it("accepts SYSTEM_EMAIL_PROVIDER=RESEND when NODE_ENV=production", () => {
    const result = backendEnvSchema.safeParse(baseProdEnv);
    expect(result.success).toBe(true);
  });
});
