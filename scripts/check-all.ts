#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

// ANSI escape sequences for clean terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

interface Step {
  id: string;
  name: string;
  command: string;
  category: "env" | "lint" | "typecheck" | "gate" | "test" | "e2e" | "build";
  description: string;
}

interface StepResult {
  step: Step;
  status: "pass" | "fail" | "skipped";
  durationSec: number;
  exitCode: number;
}

// Parse command line arguments
const args = process.argv.slice(2);
const withE2e = args.includes("--e2e") || args.includes("--with-e2e");
const withBuild = args.includes("--build");
const fastOnly = args.includes("--fast") || args.includes("--quick");

// Core check pipeline
const steps: Step[] = [
  {
    id: "lint:env-sync",
    name: "Environment Variables Synchronization & Parity",
    command: "pnpm lint:env-sync",
    category: "env",
    description: "Verify 100% key parity and Docker compose variable coverage",
  },
  {
    id: "lint:i18n",
    name: "Two-Way i18n & Zero Hardcoded Strings (pnpm lint:i18n)",
    command: "pnpm lint:i18n",
    category: "lint",
    description: "Verify dictionary keys consistency and assert zero hardcoded strings in JSX",
  },
  {
    id: "lint",
    name: "ESLint Code Quality (Backend + Frontend)",
    command: "pnpm lint",
    category: "lint",
    description: "Run ESLint and static checks across all workspace projects",
  },
  {
    id: "typecheck",
    name: "TypeScript Type Safety",
    command: "pnpm typecheck",
    category: "typecheck",
    description: "Run tsc --noEmit across backend and frontend packages",
  },
  {
    id: "lint:dtopipe",
    name: "CI Gate 3: DtoPipe Validation Coverage",
    command: "pnpm lint:dtopipe",
    category: "gate",
    description: "Assert 100% @Body() params are guarded by DtoPipe in controllers",
  },
  {
    id: "lint:error-i18n",
    name: "CI Gate 4: Error Code i18n Localization",
    command: "pnpm lint:error-i18n",
    category: "gate",
    description: "Assert all 51 domain error codes exist in vi.ts and en.ts",
  },
  {
    id: "lint:api-contract",
    name: "CI Gate 5: API Contract & Leaks Audit",
    command: "pnpm lint:api-contract",
    category: "gate",
    description: "Audit controller coverage, zero error leaks, and zero alert() calls",
  },
  {
    id: "lint:prometheus-rules",
    name: "CI Gate 6: Prometheus Alert Rules Audit",
    command: "pnpm lint:prometheus-rules",
    category: "gate",
    description: "Verify syntax, fields, severity, and team: sre labels in alert-rules.yml",
  },
  {
    id: "lint:tenant-scope",
    name: "CI Gate 10: Tenant Scoping Static Analysis",
    command: "pnpm lint:tenant-scope",
    category: "gate",
    description: "Assert 100% of Prisma queries in tenant-scoped modules are properly isolated",
  },
  {
    id: "lint:doc-links",
    name: "CI Gate 11: Documentation Markdown Link Integrity",
    command: "pnpm lint:doc-links",
    category: "gate",
    description: "Verify zero broken markdown links across all docs and memory indexes",
  },
  {
    id: "test:diff",
    name: "Test Count Delta & Anti-Regression",
    command: "pnpm test:diff",
    category: "gate",
    description: "Audit test count changes against git history to detect test regression",
  },
];

// Add unit & integration tests unless --fast is specified
if (!fastOnly) {
  steps.push({
    id: "test",
    name: "Unit & Integration Test Suite",
    command: "pnpm test",
    category: "test",
    description: "Run all 563 unit and integration tests across backend and frontend",
  });
}

// Add production build if requested
if (withBuild) {
  steps.push({
    id: "build",
    name: "Production Build Verification",
    command: "pnpm build",
    category: "build",
    description: "Compile and bundle shared, backend, and frontend packages",
  });
}

// Add Playwright E2E tests if requested
if (withE2e) {
  steps.push({
    id: "test:e2e",
    name: "CI Gate 6: Playwright E2E Test Suite",
    command: "pnpm test:e2e",
    category: "e2e",
    description: "Run 10 critical end-to-end user journeys in headless Chromium",
  });
}

console.log(`${colors.cyan}==================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}             HAIHIRE PLATFORM — COMPREHENSIVE CHECK               ${colors.reset}`);
console.log(`${colors.cyan}==================================================================${colors.reset}`);
console.log(`📋 Total Checks Scheduled: ${colors.bold}${steps.length}${colors.reset}`);
if (fastOnly) console.log(`⚡ Mode: ${colors.yellow}Fast / Quick (Tests Skipped)${colors.reset}`);
if (withBuild) console.log(`📦 Options: ${colors.green}Includes Production Build${colors.reset}`);
if (withE2e) console.log(`🌐 Options: ${colors.green}Includes Playwright E2E Suite${colors.reset}`);
console.log(`${colors.gray}──────────────────────────────────────────────────────────────────${colors.reset}\n`);

const results: StepResult[] = [];
let hasFailed = false;
const overallStart = performance.now();

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const stepNum = `[${i + 1}/${steps.length}]`;

  console.log(
    `${colors.bold}${colors.blue}${stepNum} Running: ${step.name}${colors.reset} ` +
      `${colors.gray}(${step.command})${colors.reset}`,
  );
  console.log(`${colors.dim}   ↳ ${step.description}${colors.reset}\n`);

  const stepStart = performance.now();
  // Use shell: true so pnpm commands execute cleanly on Windows and UNIX
  const execution = spawnSync(step.command, {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  const stepEnd = performance.now();
  const durationSec = Number(((stepEnd - stepStart) / 1000).toFixed(2));
  const exitCode = execution.status ?? (execution.error ? 1 : 0);

  if (exitCode === 0) {
    console.log(
      `\n${colors.green}✔ ${stepNum} PASSED${colors.reset} in ${colors.bold}${durationSec}s${colors.reset}\n`,
    );
    results.push({
      step,
      status: "pass",
      durationSec,
      exitCode,
    });
  } else {
    console.log(
      `\n${colors.red}✖ ${stepNum} FAILED${colors.reset} with exit code ${exitCode} after ${colors.bold}${durationSec}s${colors.reset}\n`,
    );
    results.push({
      step,
      status: "fail",
      durationSec,
      exitCode,
    });
    hasFailed = true;

    console.log(`${colors.red}==================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.red}❌ CHECK FAILED AT STEP: ${step.name}${colors.reset}`);
    console.log(`Command:  ${colors.yellow}${step.command}${colors.reset}`);
    console.log(`Exit Code: ${exitCode}`);
    console.log(`${colors.gray}──────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.bold}👉 To re-run and debug this step individually, execute:${colors.reset}`);
    console.log(`   ${colors.cyan}${step.command}${colors.reset}`);
    console.log(`${colors.red}==================================================================${colors.reset}\n`);
    break;
  }
}

const overallEnd = performance.now();
const totalDurationSec = Number(((overallEnd - overallStart) / 1000).toFixed(2));

// Summary scorecard
console.log(`${colors.cyan}==================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}                       VERIFICATION SUMMARY                       ${colors.reset}`);
console.log(`${colors.cyan}==================================================================${colors.reset}`);

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const res = results.find((r) => r.step.id === step.id);
  const num = (i + 1).toString().padStart(2, " ");
  const namePadded = step.name.padEnd(42, " ");

  if (res && res.status === "pass") {
    console.log(
      ` ${num}. ${namePadded} ${colors.green}[PASS]${colors.reset}  ${res.durationSec.toFixed(2).padStart(6, " ")}s`,
    );
  } else if (res && res.status === "fail") {
    console.log(
      ` ${num}. ${namePadded} ${colors.red}[FAIL]${colors.reset}  ${res.durationSec.toFixed(2).padStart(6, " ")}s`,
    );
  } else {
    console.log(
      ` ${num}. ${namePadded} ${colors.gray}[SKIPPED]${colors.reset}     -- `,
    );
  }
}

console.log(`${colors.gray}──────────────────────────────────────────────────────────────────${colors.reset}`);
console.log(` Total Time: ${colors.bold}${totalDurationSec}s${colors.reset}`);

if (!hasFailed) {
  console.log(
    ` Status: ${colors.bold}${colors.green}🟢 ALL CHECKS PASSED (${steps.length}/${steps.length}) — SYSTEM IS 100% HEALTHY & READY!${colors.reset}`,
  );
  console.log(`${colors.cyan}==================================================================${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(
    ` Status: ${colors.bold}${colors.red}🔴 CHECK FAILED — Please resolve the issue above before committing.${colors.reset}`,
  );
  console.log(`${colors.cyan}==================================================================${colors.reset}\n`);
  process.exit(1);
}
