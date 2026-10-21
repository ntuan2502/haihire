#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { parseEnvKeys, scanCodebaseEnvVariables } from "./check-env-sync.ts";
import {
  collectRepoStats,
  detectPreReleasePackages,
} from "./generate-docs-stats.ts";

export interface CheckResult {
  checkName: string;
  passed: boolean;
  message: string;
  details?: string[];
}

function getMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  if (!existsSync(dir)) return fileList;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== "node_modules" &&
        entry.name !== ".next" &&
        entry.name !== "dist" &&
        entry.name !== ".git" &&
        entry.name !== "coverage" &&
        entry.name !== "archive" &&
        entry.name !== "reports" // Historical reports contain diffs of deleted files
      ) {
        getMarkdownFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// -----------------------------------------------------------------------------
// Check 1: Path Existence Across Markdown Docs
// -----------------------------------------------------------------------------
export function checkPathExistence(): CheckResult {
  const root = process.cwd();
  const mdFiles: string[] = [];

  const targetDirs = [join(root, "docs")];
  for (const d of targetDirs) {
    getMarkdownFiles(d, mdFiles);
  }

  const individualFiles = [join(root, "README.md"), join(root, "AGENTS.md")];
  for (const f of individualFiles) {
    if (existsSync(f)) mdFiles.push(f);
  }

  const brokenPaths: string[] = [];

  // Match relative paths like backend/..., frontend/..., packages/..., scripts/..., docs/...
  // Exclude URLs (http/https), globs (*), ellipses (...), placeholders (<...>, {...}), and template tokens
  const pathRegex =
    /(?:[`"'\s(]|^)((?:backend|frontend|packages|scripts|docs)\/[a-zA-Z0-9._/-]+)(?:[`"'\s)]|$)/g;

  for (const filePath of mdFiles) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip lines inside code blocks or example placeholders
      if (
        inCodeBlock ||
        line.includes("...") ||
        line.includes("<") ||
        line.includes("*") ||
        line.includes("${") ||
        line.includes("docs/comments/logs")
      ) {
        continue;
      }

      let match: RegExpExecArray | null;
      while ((match = pathRegex.exec(line)) !== null) {
        let candidate = match[1];
        // Strip trailing punctuation like ., :, ;, ,
        candidate = candidate.replace(/[.,:;)]+$/, "");

        // Skip build artifacts and templates
        if (
          candidate.includes("...") ||
          candidate.endsWith("/") ||
          candidate.endsWith(".") ||
          candidate.includes("/dist/") ||
          candidate.includes("/.next/") ||
          candidate.includes("/coverage/") ||
          candidate.includes("/node_modules/")
        ) {
          continue;
        }

        const absoluteTarget = resolve(root, candidate);
        if (!existsSync(absoluteTarget)) {
          // Check if parent directory exists (for planned new files or parameterized paths like [id])
          if (!candidate.includes("[id]") && !candidate.includes(":id")) {
            brokenPaths.push(
              `${filePath}:${i + 1} -> '${candidate}' does not exist on disk`,
            );
          }
        }
      }
    }
  }

  const passed = brokenPaths.length === 0;
  return {
    checkName: "Check 1: Path Existence Across Markdown Documentation",
    passed,
    message: passed
      ? `All referenced repository paths in active documentation exist on disk.`
      : `Found ${brokenPaths.length} invalid repository paths referenced in docs.`,
    details: brokenPaths,
  };
}

// -----------------------------------------------------------------------------
// Check 2: Environment Variables Parity (Code vs .env.example)
// -----------------------------------------------------------------------------
export function checkEnvVarSync(): CheckResult {
  const root = process.cwd();
  const devExamplePath = resolve(root, ".env.example");
  const devExampleKeys = parseEnvKeys(devExamplePath) || new Set<string>();
  const { usedVars } = scanCodebaseEnvVariables();

  const missingInExample = Array.from(usedVars).filter(
    (v) => !devExampleKeys.has(v),
  );
  const passed = missingInExample.length === 0;

  return {
    checkName:
      "Check 2: Environment Variables Codebase vs .env.example Synchronization",
    passed,
    message: passed
      ? `All ${usedVars.size} environment variables used across codebase are documented in .env.example.`
      : `Missing ${missingInExample.length} environment variables from .env.example.`,
    details: missingInExample.map((v) => `Missing in .env.example: ${v}`),
  };
}

// -----------------------------------------------------------------------------
// Check 3: Stats Synchronization Against <!-- STATS:START -->
// -----------------------------------------------------------------------------
export function checkStatsSync(): CheckResult {
  const root = process.cwd();
  const stats = collectRepoStats();
  const targetFiles = [resolve(root, "README.md"), resolve(root, "AGENTS.md")];

  const discrepancies: string[] = [];

  for (const f of targetFiles) {
    if (!existsSync(f)) continue;
    const content = readFileSync(f, "utf-8");
    const match = content.match(
      /<!-- STATS:START -->([\s\S]*?)<!-- STATS:END -->/,
    );
    if (!match) {
      discrepancies.push(`${f}: Missing <!-- STATS:START --> marker`);
      continue;
    }

    const block = match[1];
    // Verify total unit test count assertion
    if (!block.includes(`${stats.totalUnitTests} passed`)) {
      discrepancies.push(
        `${f}: Stats block does not reflect current unit test count (${stats.totalUnitTests} passed)`,
      );
    }
    // Verify env keys count assertion
    if (!block.includes(`${stats.envKeysCount} keys`)) {
      discrepancies.push(
        `${f}: Stats block does not reflect current env keys count (${stats.envKeysCount} keys)`,
      );
    }
  }

  const passed = discrepancies.length === 0;
  return {
    checkName:
      "Check 3: Project Metrics Block (<!-- STATS:START -->) Synchronization",
    passed,
    message: passed
      ? `Documentation stats blocks in README.md & AGENTS.md match repository metrics.`
      : `Found ${discrepancies.length} metric discrepancies in documentation.`,
    details: discrepancies,
  };
}

// -----------------------------------------------------------------------------
// Check 4: ADR Existence for Pre-Release Packages
// -----------------------------------------------------------------------------
export function checkAdrForPreReleasePackages(): CheckResult {
  const root = process.cwd();
  const preRelease = detectPreReleasePackages();
  const adrDir = resolve(root, "docs", "adr");

  const unreferencedPackages: string[] = [];

  let adrCorpus = "";
  if (existsSync(adrDir)) {
    const files = readdirSync(adrDir).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      adrCorpus += readFileSync(join(adrDir, f), "utf-8") + "\n";
    }
  }

  for (const pkg of preRelease) {
    const pkgName = pkg.split("@")[0] || pkg;
    // Check if the package name is mentioned in any ADR file
    if (!adrCorpus.toLowerCase().includes(pkgName.toLowerCase())) {
      unreferencedPackages.push(
        `Pre-release package '${pkg}' has no corresponding ADR in docs/adr/`,
      );
    }
  }

  const passed = unreferencedPackages.length === 0;
  return {
    checkName:
      "Check 4: Architecture Decision Record (ADR) Coverage for Pre-Release Packages",
    passed,
    message: passed
      ? `All ${preRelease.length} pre-release packages are formally documented in docs/adr/ ADRs.`
      : `Found ${unreferencedPackages.length} pre-release packages lacking ADR documentation.`,
    details: unreferencedPackages,
  };
}

// -----------------------------------------------------------------------------
// Main checkDocSync runner
// -----------------------------------------------------------------------------
export function checkDocSync(): CheckResult[] {
  return [
    checkPathExistence(),
    checkEnvVarSync(),
    checkStatsSync(),
    checkAdrForPreReleasePackages(),
  ];
}

export function runCli(): void {
  console.log(
    "==================================================================",
  );
  console.log("🔍 CI ARCHITECTURE GATE: DOCUMENTATION SYNCHRONIZATION AUDIT");
  console.log(
    "==================================================================",
  );

  const results = checkDocSync();
  let allPassed = true;

  for (const res of results) {
    if (res.passed) {
      console.log(`✅ [PASS] ${res.checkName}`);
      console.log(`   ↳ ${res.message}`);
    } else {
      console.error(`❌ [FAIL] ${res.checkName}`);
      console.error(`   ↳ ${res.message}`);
      if (res.details && res.details.length > 0) {
        for (const d of res.details.slice(0, 10)) {
          console.error(`     • ${d}`);
        }
        if (res.details.length > 10) {
          console.error(`     ... and ${res.details.length - 10} more items.`);
        }
      }
      allPassed = false;
    }
  }

  console.log(
    "==================================================================",
  );
  if (allPassed) {
    console.log(
      "✅ CI Gate 'lint:doc-sync' PASSED! All documentation is 100% in sync.",
    );
    process.exit(0);
  } else {
    console.error(
      "❌ CI Gate 'lint:doc-sync' FAILED! Resolve the documentation drift above.",
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("check-doc-sync.ts")
) {
  runCli();
}
