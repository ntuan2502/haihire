import { defineConfig } from "vitest/config";
// Load and validate environment variables with Zod (Single Source of Truth)
import "./src/config/env.ts";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.{test,spec}.ts",
      "../monitoring/**/*.{test,spec}.ts",
      "../scripts/**/*.{test,spec}.ts",
    ],
  },
});
