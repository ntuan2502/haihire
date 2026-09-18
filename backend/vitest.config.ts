import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  test: {
    environment: "node",
    env: {
      JWT_SECRET: process.env.JWT_SECRET || "ats-platform-dev-jwt-secret-key-2026",
      ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET || "ats-platform-dev-encryption-key-32-chars-2026",
    },
  },
});
