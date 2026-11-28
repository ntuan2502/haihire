import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";
import { resolveDatabaseUrlFromEnv } from "./src/config/database-url.ts";
import { resolveTestDatabaseUrl } from "./src/test/helpers/test-db-url.ts";

function findWorkspaceRoot(startDir: string): string {
  let curr = startDir;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, "pnpm-workspace.yaml"))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return startDir;
}

const repoRoot = findWorkspaceRoot(process.cwd());
dotenv.config({ path: path.resolve(repoRoot, ".env") });
dotenv.config();

const testDatabaseUrl = resolveTestDatabaseUrl(
  resolveDatabaseUrlFromEnv(process.env),
  {
    postgresPort: process.env.POSTGRES_PORT,
  },
);

process.env.NODE_ENV = "test";
if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

// Load and validate environment variables with Zod (Single Source of Truth)
await import("./src/config/env.ts");

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./src/test/vitest-global-setup.ts"],
    env: {
      NODE_ENV: "test",
      ...(testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {}),
    },
    coverage: {
      provider: "v8",
      exclude: ["service.ts"],
      thresholds: {
        lines: 83,
        functions: 82,
        branches: 66,
        statements: 83,
      },
    },
    include: [
      "src/**/*.{test,spec}.ts",
      "test/**/*.{test,spec,e2e-spec}.ts",
      "scripts/**/*.{test,spec}.ts",
      "../../monitoring/**/*.{test,spec}.ts",
      "../../scripts/**/*.{test,spec}.ts",
      "../../packages/shared/src/**/*.{test,spec}.ts",
    ],
  },
});
