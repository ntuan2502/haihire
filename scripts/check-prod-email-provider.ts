#!/usr/bin/env tsx

import * as fs from "node:fs";
import * as path from "node:path";

export interface ValidateEmailProviderOptions {
  nodeEnv?: string;
  provider?: string;
}

export interface ValidationResult {
  ok: boolean;
  message: string;
}

export function validateProdEmailProvider(
  options: ValidateEmailProviderOptions = {},
): ValidationResult {
  const nodeEnv =
    options.nodeEnv !== undefined ? options.nodeEnv : process.env.NODE_ENV;
  const provider =
    options.provider !== undefined
      ? options.provider
      : process.env.SYSTEM_EMAIL_PROVIDER;

  if (nodeEnv === "production" && provider === "SIMULATED") {
    return {
      ok: false,
      message:
        "CRITICAL ERROR: SYSTEM_EMAIL_PROVIDER cannot be 'SIMULATED' when NODE_ENV is 'production'. Real email dispatch (SMTP, RESEND, or SENDGRID) is required for production builds.",
    };
  }

  return {
    ok: true,
    message: `Production email provider check OK (NODE_ENV='${nodeEnv ?? ""}', SYSTEM_EMAIL_PROVIDER='${provider ?? ""}').`,
  };
}

export function validateEnvTemplateFiles(
  rootDir = process.cwd(),
): ValidationResult {
  const templates = [".env.production.example", ".env.staging.example"];
  for (const rel of templates) {
    const fullPath = path.join(rootDir, rel);
    if (!fs.existsSync(fullPath)) continue;
    const raw = fs.readFileSync(fullPath, "utf-8");
    let nodeEnv: string | undefined;
    let provider: string | undefined;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key === "NODE_ENV") nodeEnv = val;
      if (key === "SYSTEM_EMAIL_PROVIDER") provider = val;
    }
    const res = validateProdEmailProvider({ nodeEnv, provider });
    if (!res.ok) {
      return {
        ok: false,
        message: `${rel}: ${res.message}`,
      };
    }
  }
  return {
    ok: true,
    message: "Environment template email provider check OK.",
  };
}

export function runCli(): void {
  const envResult = validateProdEmailProvider();
  if (!envResult.ok) {
    console.error(`[ERROR] ${envResult.message}`);
    process.exit(1);
  }
  const tplResult = validateEnvTemplateFiles();
  if (!tplResult.ok) {
    console.error(`[ERROR] ${tplResult.message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${envResult.message} (${tplResult.message})`);
  process.exit(0);
}

// Auto-run when executed directly via CLI
if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("check-prod-email-provider.ts")
) {
  runCli();
}
