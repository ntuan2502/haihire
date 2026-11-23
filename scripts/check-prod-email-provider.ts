#!/usr/bin/env tsx

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

export function runCli(): void {
  const result = validateProdEmailProvider();
  if (!result.ok) {
    console.error(`[ERROR] ${result.message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${result.message}`);
  process.exit(0);
}

// Auto-run when executed directly via CLI
if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("check-prod-email-provider.ts")
) {
  runCli();
}
