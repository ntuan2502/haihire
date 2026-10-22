import { defineConfig } from "vitest/config";
// Load and validate environment variables with Zod (Single Source of Truth)
import "./src/config/env.ts";

export default defineConfig({
  test: {
    environment: "node",
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
      "../monitoring/**/*.{test,spec}.ts",
      "../scripts/**/*.{test,spec}.ts",
    ],
  },
});
