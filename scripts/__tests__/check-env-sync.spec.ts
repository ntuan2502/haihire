import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractComposeVariableDetails,
  parseDocumentedEnvKeys,
  parseEnvKeys,
} from "../check-env-sync";

describe("check-env-sync helpers", () => {
  it("distinguishes active keys from commented optional overrides", () => {
    const dir = mkdtempSync(join(tmpdir(), "haihire-env-sync-"));
    try {
      const envFile = join(dir, ".env.example");
      writeFileSync(
        envFile,
        [
          "# Comment header",
          "NODE_ENV=development",
          "# Optional overrides",
          "# DATABASE_URL=",
          "# SYSTEM_EMAIL_SMTP_HOST=smtp.example.com",
          "# just a prose comment = ignored",
        ].join("\n"),
      );

      const active = parseEnvKeys(envFile);
      const documented = parseDocumentedEnvKeys(envFile);

      expect(Array.from(active ?? [])).toEqual(["NODE_ENV"]);
      expect(Array.from(documented ?? [])).toEqual([
        "NODE_ENV",
        "DATABASE_URL",
        "SYSTEM_EMAIL_SMTP_HOST",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("separates required vs defaulted variables in docker-compose files", () => {
    const dir = mkdtempSync(join(tmpdir(), "haihire-compose-vars-"));
    try {
      const composeFile = join(dir, "docker-compose.yml");
      writeFileSync(
        composeFile,
        [
          "services:",
          "  api:",
          "    environment:",
          "      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD:?missing}@postgres:5432/${POSTGRES_DB:-haihire}",
          "      REDIS_HOST: ${REDIS_HOST:-redis}",
          "      SHELL_ESC: $${REDIS_PASSWORD}",
        ].join("\n"),
      );

      const details = extractComposeVariableDetails(composeFile);

      expect(Array.from(details.required).sort()).toEqual([
        "POSTGRES_PASSWORD",
        "POSTGRES_USER",
      ]);
      expect(Array.from(details.defaulted).sort()).toEqual([
        "POSTGRES_DB",
        "REDIS_HOST",
      ]);
      expect(details.all.has("REDIS_PASSWORD")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
