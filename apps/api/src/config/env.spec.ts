import { describe, expect, it } from "vitest";
import { backendEnvSchema } from "./env";
import { resolveDatabaseUrlFromEnv } from "./database-url";

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
    SYSTEM_EMAIL_PROVIDER: "RESEND",
    SYSTEM_EMAIL_FROM_NAME: "HaiHire",
    SYSTEM_EMAIL_FROM_EMAIL: "noreply@example.com",
    SYSTEM_EMAIL_RESEND_API_KEY: "re_test_123",
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

  it("accepts SYSTEM_EMAIL_PROVIDER=RESEND without empty SMTP/SendGrid/MINIO_PUBLIC_URL placeholders", () => {
    const result = backendEnvSchema.safeParse(baseProdEnv);
    expect(result.success).toBe(true);
  });

  it("accepts SYSTEM_EMAIL_PROVIDER=SIMULATED in development without SMTP/Resend/SendGrid keys", () => {
    const result = backendEnvSchema.safeParse({
      ...baseProdEnv,
      NODE_ENV: "development",
      SYSTEM_EMAIL_PROVIDER: "SIMULATED",
      SYSTEM_EMAIL_RESEND_API_KEY: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe("resolveDatabaseUrlFromEnv", () => {
  it("derives DATABASE_URL from POSTGRES_* variables when DATABASE_URL is omitted", () => {
    const resolved = resolveDatabaseUrlFromEnv({
      POSTGRES_USER: "haihire_user",
      POSTGRES_PASSWORD: "p@ss:word",
      POSTGRES_DB: "haihire_db",
      POSTGRES_PORT: "5433",
    });
    expect(resolved).toBe(
      "postgresql://haihire_user:p%40ss%3Aword@localhost:5433/haihire_db?schema=public",
    );
  });

  it("rewrites loopback port on explicit DATABASE_URL when POSTGRES_PORT is set", () => {
    const resolved = resolveDatabaseUrlFromEnv({
      DATABASE_URL:
        "postgresql://user:pass@127.0.0.1:5432/haihire_db?schema=public",
      POSTGRES_PORT: "5544",
    });
    expect(resolved).toBe(
      "postgresql://user:pass@127.0.0.1:5544/haihire_db?schema=public",
    );
  });
});
