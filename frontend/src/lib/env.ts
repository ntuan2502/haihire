import { z } from "zod";

const frontendEnvSchema = z.object({
  // Server-side communication with NestJS Backend
  INTERNAL_API_URL: z
    .string()
    .min(1, "INTERNAL_API_URL is required in frontend/.env for Server-Side API communication"),

  // Browser Client-side API route (default empty to use Next.js proxy rewrites)
  NEXT_PUBLIC_API_URL: z.string().default(""),

  // MinIO documents proxy or direct URL
  NEXT_PUBLIC_MINIO_URL: z.string().default("/ats-resumes"),
});

export type FrontendEnv = z.infer<typeof frontendEnvSchema>;

const parsed = frontendEnvSchema.safeParse({
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_MINIO_URL: process.env.NEXT_PUBLIC_MINIO_URL,
});

if (!parsed.success) {
  console.error("\n===========================================================");
  console.error("❌ CRITICAL CONFIGURATION ERROR: Invalid Frontend Environment!");
  console.error("===========================================================");
  console.error(parsed.error.format());
  console.error("===========================================================\n");
  throw new Error("Invalid / missing frontend environment configuration. Check frontend/.env");
}

export const env: FrontendEnv = parsed.data;
