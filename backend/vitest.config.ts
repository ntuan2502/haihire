import { defineConfig } from "vitest/config";
// Load and validate environment variables with Zod (Single Source of Truth)
import "./src/config/env.ts";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 84,
        functions: 83,
        branches: 66,
        statements: 83,
      },
    },
    include: [
      "src/**/*.{test,spec}.ts",
      "test/**/*.{test,spec,e2e-spec}.ts",
      "scripts/**/*.{test,spec}.ts",
      "../monitoring/**/*.{test,spec}.ts",
      "../scripts/**/*.{test,spec}.ts",
    ],
  },
});
