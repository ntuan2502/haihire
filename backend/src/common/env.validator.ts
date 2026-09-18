const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ENCRYPTION_SECRET",
  "FRONTEND_URL",
  "MINIO_ENDPOINT",
  "MINIO_PORT",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "MINIO_BUCKET_NAME",
] as const;

export function validateEnvironment(): void {
  const missingVars: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    const val = process.env[envVar];
    if (!val || val.trim().length === 0) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.error("\n===========================================================");
    console.error("❌ CRITICAL CONFIGURATION ERROR: Missing Environment Variables!");
    console.error("===========================================================");
    console.error("The following required environment variables are not set in .env:");
    for (const v of missingVars) {
      console.error(`  - ${v}`);
    }
    console.error("\nPlease check your .env or .env.example file and populate all required keys.");
    console.error("===========================================================\n");
    process.exit(1);
  }
}
