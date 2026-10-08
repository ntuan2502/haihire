#!/usr/bin/env tsx
import * as fs from "node:fs";
import * as path from "node:path";
import {
  MODELS_WITHOUT_ORG_COLUMN,
  NON_TENANT_SCOPED_FILES,
  TENANT_SCOPED_MODULES,
  SAFE_QUERY_PATTERNS,
} from "./tenant-scoping.config.ts";

export interface QueryViolation {
  file: string;
  line: number;
  model: string;
  method?: string;
  snippet: string;
  reason: string;
}

export interface TenantScopingAuditResult {
  compliant: boolean;
  totalFiles: number;
  totalQueries: number;
  safeQueries: number;
  unsafeQueries: number;
  explicitFilterCount: number;
  modelWhitelistCount: number;
  parentGuardCount: number;
  patternMatchCount: number;
  violations: QueryViolation[];
  scannedFiles: string[];
}

export const PRISMA_QUERY_REGEX =
  /(?:this\.prisma\.db|tx|db)\.orm\.public\.([A-Za-z0-9_]+)(?:\s*\.\s*([A-Za-z0-9_]+))?/g;

/**
 * Determines the repository root directory regardless of current working directory.
 */
function getWorkspaceRoot(): string {
  if (fs.existsSync(path.resolve(process.cwd(), "pnpm-workspace.yaml"))) {
    return process.cwd();
  }
  const parent = path.dirname(process.cwd());
  if (fs.existsSync(path.resolve(parent, "pnpm-workspace.yaml"))) {
    return parent;
  }
  return process.cwd();
}

/**
 * Normalizes file path to forward slashes relative to workspace root.
 */
function normalizeRelativePath(filePath: string): string {
  const root = getWorkspaceRoot();
  const relative = path.relative(root, filePath);
  return relative.replace(/\\/g, "/");
}

/**
 * Recursively discovers tenant-scoped service files.
 */
export function findTenantServiceFiles(baseDir?: string): string[] {
  const root = getWorkspaceRoot();
  const targetDir = baseDir || path.resolve(root, "backend/src");
  const result: string[] = [];
  if (!fs.existsSync(targetDir)) return result;

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith(".service.ts")) {
        const normRel = normalizeRelativePath(fullPath);

        // Skip files present in NON_TENANT_SCOPED_FILES
        const isNonTenant = NON_TENANT_SCOPED_FILES.some((f) =>
          normRel.endsWith(f.replace(/\\/g, "/")),
        );
        if (isNonTenant) {
          continue;
        }

        // If scanning within backend/src, verify module is in TENANT_SCOPED_MODULES
        const isBackendSrc = normRel.startsWith("backend/src/");
        if (isBackendSrc) {
          const isTenantModule = TENANT_SCOPED_MODULES.some(
            (mod) =>
              normRel.startsWith(`backend/src/${mod}/`) ||
              normRel.includes(`/${mod}/`),
          );
          if (!isTenantModule) {
            continue;
          }
        }

        result.push(fullPath);
      }
    }
  }

  walk(targetDir);
  return result.sort();
}

/**
 * Performs static analysis audit on Prisma ORM queries across tenant service files.
 */
export function checkTenantScoping(options?: {
  baseDir?: string;
  files?: string[];
}): TenantScopingAuditResult {
  const filesToScan = options?.files || findTenantServiceFiles(options?.baseDir);

  let totalQueries = 0;
  let explicitFilterCount = 0;
  let modelWhitelistCount = 0;
  let parentGuardCount = 0;
  let patternMatchCount = 0;
  const violations: QueryViolation[] = [];
  const scannedRelativeFiles: string[] = [];

  for (const filePath of filesToScan) {
    const relativePath = normalizeRelativePath(filePath);
    scannedRelativeFiles.push(relativePath);

    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    const regex = new RegExp(PRISMA_QUERY_REGEX.source, "g");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      totalQueries++;
      const modelName = match[1];
      const methodName = match[2];
      const matchIndex = match.index;
      const lineNumber = content.slice(0, matchIndex).split("\n").length;
      const lineSnippet = lines[lineNumber - 1]?.trim() || "";

      // Step 1: Check model name against MODELS_WITHOUT_ORG_COLUMN
      if (MODELS_WITHOUT_ORG_COLUMN.has(modelName)) {
        modelWhitelistCount++;
        continue;
      }

      // Step 2: Context window check (lookahead 350 characters for organizationId / targetOrgId)
      const contextWindow = content.slice(matchIndex, matchIndex + 350);
      if (
        contextWindow.includes("organizationId") ||
        contextWindow.includes("targetOrgId")
      ) {
        explicitFilterCount++;
        continue;
      }

      // Step 3: Function scope detection (look backwards for parent verification)
      const beforeContent = content.slice(0, matchIndex);
      const funcMatch = beforeContent.match(
        /(?:async|private|public|function)\s+([A-Za-z0-9_]+)\s*\([^)]*\)[\s\S]*$/,
      );
      const funcPrefix = funcMatch ? funcMatch[0] : "";

      const hasParentGuard =
        funcPrefix.includes(".organizationId !==") ||
        funcPrefix.includes(".organizationId ===") ||
        funcPrefix.includes("throw new AppForbiddenException");

      if (hasParentGuard) {
        parentGuardCount++;
        continue;
      }

      // Step 4: Check safe query patterns
      const funcNameMatches = beforeContent.match(
        /(?:async|private|public|function)\s+([A-Za-z0-9_]+)\s*\(/g,
      );
      const currentFuncName = funcNameMatches
        ? funcNameMatches[funcNameMatches.length - 1]
        : "";

      const isSafePattern = SAFE_QUERY_PATTERNS.some(
        (pattern) =>
          pattern.test(currentFuncName) || pattern.test(contextWindow),
      );

      if (isSafePattern) {
        patternMatchCount++;
        continue;
      }

      // Step 5: Unsafe query detected
      violations.push({
        file: relativePath,
        line: lineNumber,
        model: modelName,
        method: methodName,
        snippet: lineSnippet,
        reason: "No organizationId filter and parent not verified.",
      });
    }
  }

  const unsafeQueries = violations.length;
  const safeQueries = totalQueries - unsafeQueries;
  const compliant = unsafeQueries === 0;

  return {
    compliant,
    totalFiles: scannedRelativeFiles.length,
    totalQueries,
    safeQueries,
    unsafeQueries,
    explicitFilterCount,
    modelWhitelistCount,
    parentGuardCount,
    patternMatchCount,
    violations,
    scannedFiles: scannedRelativeFiles,
  };
}

/**
 * Formats audit results into standard CI report text.
 */
export function formatReport(result: TenantScopingAuditResult): string {
  const lines: string[] = [];
  lines.push("==================================================================");
  lines.push("      CI ARCHITECTURE GATE: TENANT SCOPING AUDIT                  ");
  lines.push("==================================================================");
  lines.push(`Scanned files: ${result.totalFiles}`);
  lines.push(`Total queries inspected: ${result.totalQueries}`);
  lines.push(`Safe queries: ${result.safeQueries}`);
  lines.push(`Unsafe queries: ${result.unsafeQueries}`);
  lines.push("------------------------------------------------------------------");

  if (result.compliant) {
    lines.push(
      `[CI GATE PASSED] All ${result.totalQueries} tenant-scoped queries are properly isolated!`,
    );
    lines.push(
      `  • ${result.explicitFilterCount} queries have explicit organizationId/targetOrgId filter`,
    );
    lines.push(
      `  • 4 models whitelisted (no org column in schema): Interview, Application, TrackingClick, Organization (${result.modelWhitelistCount} queries)`,
    );
    lines.push(
      `  • ${result.parentGuardCount} queries verified via parent object guard`,
    );
    if (result.patternMatchCount > 0) {
      lines.push(
        `  • ${result.patternMatchCount} queries matched safe query patterns`,
      );
    }
    lines.push("==================================================================");
  } else {
    lines.push(`[CI GATE FAILED] Found ${result.violations.length} unsafe queries:\n`);
    result.violations.forEach((v, index) => {
      lines.push(`${index + 1}. ${v.file}:${v.line}`);
      lines.push(`   Query: ${v.snippet}`);
      lines.push(`   Reason: ${v.reason}\n`);
    });
    lines.push("ACTION REQUIRED:");
    lines.push("  - Add organizationId filter to the query, OR");
    lines.push(
      "  - Verify parent object (e.g. .organizationId !== tenantOrgId) before the query, OR",
    );
    lines.push(
      "  - Add to whitelist in scripts/tenant-scoping.config.ts with reason.",
    );
    lines.push("==================================================================");
  }

  return lines.join("\n");
}

// Standalone execution
if (
  process.argv[1]?.endsWith("check-tenant-scoping.ts") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/check-tenant-scoping.ts")
) {
  const result = checkTenantScoping();
  const report = formatReport(result);

  if (result.compliant) {
    console.log(report);
    process.exit(0);
  } else {
    console.error(report);
    process.exit(1);
  }
}
