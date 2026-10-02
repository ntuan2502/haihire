import { APP_ERROR_CODES } from "../packages/shared/src/errors";
import { vi } from "../frontend/src/i18n/locales/vi";
import { en } from "../frontend/src/i18n/locales/en";

const codes = Object.keys(APP_ERROR_CODES) as (keyof typeof APP_ERROR_CODES)[];

const missingVi: string[] = [];
const missingEn: string[] = [];

for (const code of codes) {
  if (!(code in vi.errors)) {
    missingVi.push(code);
  }
  if (!(code in en.errors)) {
    missingEn.push(code);
  }
}

console.log("=================================================");
console.log(`Auditing ${codes.length} Error Codes in Shared Contract:`);
console.log("=================================================");

if (missingVi.length > 0) {
  console.error(`[FAIL] Missing in vi.ts (${missingVi.length}):`, missingVi);
} else {
  console.log(`[PASS] 100% error codes present in vi.ts (${codes.length}/${codes.length})`);
}

if (missingEn.length > 0) {
  console.error(`[FAIL] Missing in en.ts (${missingEn.length}):`, missingEn);
} else {
  console.log(`[PASS] 100% error codes present in en.ts (${codes.length}/${codes.length})`);
}

if (missingVi.length > 0 || missingEn.length > 0) {
  process.exit(1);
} else {
  console.log("\n[SUCCESS] Error code i18n coverage check passed!");
}
