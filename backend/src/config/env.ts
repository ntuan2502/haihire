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
