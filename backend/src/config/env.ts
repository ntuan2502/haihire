import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";

// Load root .env regardless of CWD (works from root or from backend/)
const repoRoot = process.cwd().endsWith("backend")
  ? path.resolve(process.cwd(), "..")
  : process.cwd();
const rootEnvPath = path.resolve(repoRoot, ".env");
dotenv.config({ path: rootEnvPath });
dotenv.config();

const backendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce
    .number()
    .int("PORT must be an integer")
    .min(1, "PORT must be between 1 and 65535")
    .max(65535, "PORT must be between 1 and 65535"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters for cryptographic security"),
  ENCRYPTION_SECRET: z
    .string()
    .min(32, "ENCRYPTION_SECRET must be at least 32 characters for AES-256 security"),
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL is required for CORS whitelist"),
  MINIO_ENDPOINT: z.string().min(1, "MINIO_ENDPOINT is required"),
  MINIO_PORT: z.coerce.number().int("MINIO_PORT must be an integer"),
  MINIO_USE_SSL: z
    .enum(["true", "false", "1", "0"])
    .transform((val) => val === "true" || val === "1"),
  MINIO_ACCESS_KEY: z.string().min(1, "MINIO_ACCESS_KEY is required"),
  MINIO_SECRET_KEY: z.string().min(1, "MINIO_SECRET_KEY is required"),
  MINIO_BUCKET_NAME: z.string().min(1, "MINIO_BUCKET_NAME is required"),
  MINIO_PUBLIC_URL: z.string().min(1, "MINIO_PUBLIC_URL is required"),
  // System Email Configuration
  SYSTEM_EMAIL_PROVIDER: z.enum(["SIMULATED", "SMTP", "RESEND", "SENDGRID"]),
  SYSTEM_EMAIL_FROM_NAME: z.string().min(1, "SYSTEM_EMAIL_FROM_NAME is required"),
  SYSTEM_EMAIL_FROM_EMAIL: z.string().email("SYSTEM_EMAIL_FROM_EMAIL must be a valid email address"),
  SYSTEM_EMAIL_SMTP_HOST: z.string(),
  SYSTEM_EMAIL_SMTP_PORT: z.coerce.number().int("SYSTEM_EMAIL_SMTP_PORT must be an integer"),
  SYSTEM_EMAIL_SMTP_USER: z.string(),
  SYSTEM_EMAIL_SMTP_PASS: z.string(),
  SYSTEM_EMAIL_RESEND_API_KEY: z.string(),
  SYSTEM_EMAIL_SENDGRID_API_KEY: z.string(),
  // Multi-Channel Webhook Configuration (Optional Global Fallback)
  WEBHOOK_PROVIDER: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.enum(["TELEGRAM", "DISCORD", "GENERIC"]).optional(),
  ),
  WEBHOOK_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional(),
  ),
  WEBHOOK_SECRET_TOKEN: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  WEBHOOK_CHAT_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
})
.superRefine((data, ctx) => {
  if (data.WEBHOOK_PROVIDER) {
    if (!data.WEBHOOK_URL || !data.WEBHOOK_URL.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WEBHOOK_URL"],
        message: "WEBHOOK_URL is required when WEBHOOK_PROVIDER is set",
      });
    }
    if (data.WEBHOOK_PROVIDER === "TELEGRAM") {
      if (!data.WEBHOOK_CHAT_ID || !data.WEBHOOK_CHAT_ID.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["WEBHOOK_CHAT_ID"],
          message: "WEBHOOK_CHAT_ID is required when WEBHOOK_PROVIDER is 'TELEGRAM'",
        });
      }
    }
  }

  if (data.SYSTEM_EMAIL_PROVIDER === "SMTP") {
    if (!data.SYSTEM_EMAIL_SMTP_HOST.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SYSTEM_EMAIL_SMTP_HOST"],
        message: "SYSTEM_EMAIL_SMTP_HOST is required when SYSTEM_EMAIL_PROVIDER is 'SMTP'",
      });
    }
    if (!data.SYSTEM_EMAIL_SMTP_USER.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SYSTEM_EMAIL_SMTP_USER"],
        message: "SYSTEM_EMAIL_SMTP_USER is required when SYSTEM_EMAIL_PROVIDER is 'SMTP'",
      });
    }
    if (!data.SYSTEM_EMAIL_SMTP_PASS.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SYSTEM_EMAIL_SMTP_PASS"],
        message: "SYSTEM_EMAIL_SMTP_PASS is required when SYSTEM_EMAIL_PROVIDER is 'SMTP'",
      });
    }
  } else if (data.SYSTEM_EMAIL_PROVIDER === "RESEND") {
    if (!data.SYSTEM_EMAIL_RESEND_API_KEY.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SYSTEM_EMAIL_RESEND_API_KEY"],
        message: "SYSTEM_EMAIL_RESEND_API_KEY is required when SYSTEM_EMAIL_PROVIDER is 'RESEND'",
      });
    }
  } else if (data.SYSTEM_EMAIL_PROVIDER === "SENDGRID") {
    if (!data.SYSTEM_EMAIL_SENDGRID_API_KEY.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SYSTEM_EMAIL_SENDGRID_API_KEY"],
        message: "SYSTEM_EMAIL_SENDGRID_API_KEY is required when SYSTEM_EMAIL_PROVIDER is 'SENDGRID'",
      });
    }
  }
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;

const rawPort = process.env.BACKEND_PORT || process.env.PORT || "3001";
const rawFrontendPort = process.env.FRONTEND_PORT;
const rawPostgresPort = process.env.POSTGRES_PORT;
const rawMinioPort = process.env.MINIO_PORT;

let databaseUrl = process.env.DATABASE_URL || "";
if (rawPostgresPort && databaseUrl.includes("@localhost:")) {
  databaseUrl = databaseUrl.replace(/@localhost:\d+/, `@localhost:${rawPostgresPort}`);
} else if (rawPostgresPort && databaseUrl.includes("@127.0.0.1:")) {
  databaseUrl = databaseUrl.replace(/@127.0.0.1:\d+/, `@127.0.0.1:${rawPostgresPort}`);
}

let frontendUrl = process.env.FRONTEND_URL || "";
if (rawFrontendPort && frontendUrl.includes("localhost:")) {
  frontendUrl = frontendUrl.replace(/localhost:\d+/, `localhost:${rawFrontendPort}`);
} else if (rawFrontendPort && frontendUrl.includes("127.0.0.1:")) {
  frontendUrl = frontendUrl.replace(/127.0.0.1:\d+/, `127.0.0.1:${rawFrontendPort}`);
}

let minioPublicUrl = process.env.MINIO_PUBLIC_URL || "";
if (rawMinioPort && minioPublicUrl.includes("localhost:")) {
  minioPublicUrl = minioPublicUrl.replace(/localhost:\d+/, `localhost:${rawMinioPort}`);
} else if (rawMinioPort && minioPublicUrl.includes("127.0.0.1:")) {
  minioPublicUrl = minioPublicUrl.replace(/127.0.0.1:\d+/, `127.0.0.1:${rawMinioPort}`);
}

const envInput = {
  ...process.env,
  PORT: rawPort,
  ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
  ...(frontendUrl ? { FRONTEND_URL: frontendUrl } : {}),
  ...(rawMinioPort ? { MINIO_PORT: rawMinioPort } : {}),
  ...(minioPublicUrl ? { MINIO_PUBLIC_URL: minioPublicUrl } : {}),
};

const parsed = backendEnvSchema.safeParse(envInput);

if (!parsed.success) {
  console.error("\n===========================================================");
  console.error("❌ CRITICAL CONFIGURATION ERROR: Invalid / Missing Environment!");
  console.error("===========================================================");
  console.error("The following errors were detected in .env:\n");

  const formattedErrors = parsed.error.format();
  for (const [key, val] of Object.entries(formattedErrors)) {
    if (key === "_errors") continue;
    const errObj = val as { _errors: string[] };
    if (errObj?._errors?.length) {
      console.error(`  - ${key}: ${errObj._errors.join(", ")}`);
    }
  }

  console.error(
    "\nPlease check your .env (refer to .env.example) and populate all required variables.",
  );
  console.error("===========================================================\n");
  process.exit(1);
}

export const env: BackendEnv = parsed.data;
