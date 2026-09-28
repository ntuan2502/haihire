import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";

// Load backend .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
dotenv.config();

const backendEnvSchema = z.object({
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
})
.superRefine((data, ctx) => {
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

const parsed = backendEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n===========================================================");
  console.error("❌ CRITICAL CONFIGURATION ERROR: Invalid / Missing Environment!");
  console.error("===========================================================");
  console.error("The following errors were detected in backend/.env:\n");

  const formattedErrors = parsed.error.format();
  for (const [key, val] of Object.entries(formattedErrors)) {
    if (key === "_errors") continue;
    const errObj = val as { _errors: string[] };
    if (errObj?._errors?.length) {
      console.error(`  - ${key}: ${errObj._errors.join(", ")}`);
    }
  }

  console.error(
    "\nPlease check your backend/.env (refer to backend/.env.example) and populate all required variables.",
  );
  console.error("===========================================================\n");
  process.exit(1);
}

export const env: BackendEnv = parsed.data;
