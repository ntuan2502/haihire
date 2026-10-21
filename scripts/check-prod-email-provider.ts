#!/usr/bin/env tsx
import {
  runCli,
  validateProdEmailProvider,
} from "../backend/scripts/check-prod-email-provider.ts";

export { runCli, validateProdEmailProvider };

if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("check-prod-email-provider.ts")
) {
  runCli();
}
