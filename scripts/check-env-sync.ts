#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join, extname } from "node:path";

export interface EnvPairCheck {
  name: string;
  exampleFile: string;
  targetFile: string;
  requiredTarget?: boolean;
}

export interface ComposeVarUsage {
  required: Set<string>;
  defaulted: Set<string>;
  all: Set<string>;
}

/** Parses active (uncommented) `KEY=...` declarations in a `.env` file. */
export function parseEnvKeys(filePath: string): Set<string> | null {
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath, "utf-8");
  const keys = new Set<string>();
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match && match[1]) {
      keys.add(match[1]);
    }
  }
  return keys;
}

/**
 * Parses both active `KEY=...` lines and commented optional `# KEY=...` lines
 * in a template file so valid optional overrides remain whitelisted without
 * bloating `.env` with empty `=""` placeholders.
 */
export function parseDocumentedEnvKeys(filePath: string): Set<string> | null {
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath, "utf-8");
  const keys = new Set<string>();
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const activeMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (activeMatch?.[1]) {
      keys.add(activeMatch[1]);
      continue;
    }
    const optionalMatch = line.match(/^#\s*([A-Z][A-Z0-9_]*)\s*=/);
    if (optionalMatch?.[1]) {
      keys.add(optionalMatch[1]);
    }
  }
  return keys;
}

export function parseEnvKeyValueMap(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(filePath)) return map;
  const content = readFileSync(filePath, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && match[1]) {
      let val = match[2] || "";
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      map.set(match[1], val);
    }
  }
  return map;
}

/** Extracts `${VAR}` references, separating required vs defaulted variables. */
export function extractComposeVariableDetails(
  filePath: string,
): ComposeVarUsage {
  const required = new Set<string>();
  const defaulted = new Set<string>();
  const all = new Set<string>();
  if (!existsSync(filePath)) {
    return { required, defaulted, all };
  }

  const content = readFileSync(filePath, "utf-8");
  const regex =
    /(?<!\$)\$\{([A-Za-z_][A-Za-z0-9_]*)(?:(:-|:\?|\?|-|=|:=)([^}]*))?\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const varName = match[1];
    const operator = match[2];
    if (!varName) continue;
    all.add(varName);
    if (!operator || operator === ":?" || operator === "?") {
      required.add(varName);
      defaulted.delete(varName);
    } else if (!required.has(varName)) {
      defaulted.add(varName);
    }
  }
  return { required, defaulted, all };
}

export function extractComposeVariables(filePath: string): Set<string> {
  return extractComposeVariableDetails(filePath).all;
}

const OS_PLATFORM_VARS = new Set([
  "CI",
  "CONTINUOUS_INTEGRATION",
  "GITHUB_ACTIONS",
  "GITHUB_ACTOR",
  "GITHUB_REPOSITORY",
  "GITHUB_REF",
  "GITHUB_BASE_REF",
  "GITHUB_SHA",
  "PLAYWRIGHT_BASE_URL",
  "BASE_URL",
  "NEXT_TELEMETRY_DISABLED",
  "VITE_CJS_IGNORE_WARNING",
  "ALLOW_PRODUCTION_SEED",
  "ALLOW_TEST_DELETION",
  "STORE_PATH",
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "PWD",
  "TERM",
  "APPDATA",
  "LOCALAPPDATA",
  "TEMP",
  "TMP",
  "OS",
  "PROCESSOR_ARCHITECTURE",
  "SystemDrive",
  "SystemRoot",
]);

function collectFiles(
  dir: string,
  extensions: string[],
  result: string[] = [],
): string[] {
  if (!existsSync(dir)) return result;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== "node_modules" &&
        entry.name !== ".next" &&
        entry.name !== "dist" &&
        entry.name !== ".git" &&
        entry.name !== "coverage"
      ) {
        collectFiles(fullPath, extensions, result);
      }
    } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
      result.push(fullPath);
    }
  }
  return result;
}

export function scanCodebaseEnvVariables(): {
  usedVars: Set<string>;
  varLocations: Map<string, string[]>;
} {
  const root = process.cwd();
  const files: string[] = [];

  collectFiles(join(root, "apps", "api", "src"), [".ts"], files);
  collectFiles(join(root, "apps", "web", "src"), [".ts", ".tsx"], files);
  collectFiles(join(root, "packages"), [".ts"], files);
  collectFiles(join(root, "scripts"), [".ts"], files);

  const individualFiles = [
    join(root, "apps", "web", "next.config.ts"),
    join(root, "apps", "api", "vitest.config.ts"),
    join(root, "apps", "web", "vitest.config.mts"),
    join(root, "playwright.config.ts"),
  ];
  for (const f of individualFiles) {
    if (existsSync(f)) files.push(f);
  }

  const usedVars = new Set<string>();
  const varLocations = new Map<string, string[]>();

  const processEnvRegex =
    /process\.env\.([A-Z][A-Z0-9_]*)|process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g;

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    let match: RegExpExecArray | null;
    while ((match = processEnvRegex.exec(content)) !== null) {
      const varName = match[1] || match[2];
      if (
        varName &&
        !OS_PLATFORM_VARS.has(varName) &&
        !varName.startsWith("npm_")
      ) {
        usedVars.add(varName);
        const locs = varLocations.get(varName) || [];
        locs.push(file);
        varLocations.set(varName, locs);
      }
    }
  }

  // Also parse Zod schema keys in apps/api/src/config/env.ts
  const backendEnvFile = join(root, "apps", "api", "src", "config", "env.ts");
  if (existsSync(backendEnvFile)) {
    const content = readFileSync(backendEnvFile, "utf-8");
    const schemaBlockMatch = content.match(
      /const\s+backendEnvSchema\s*=\s*z\.object\(\{([\s\S]*?)\}\)\s*\.superRefine/,
    );
    const targetBlock = schemaBlockMatch ? schemaBlockMatch[1] : content;
    const keyRegex = /^\s*([A-Z][A-Z0-9_]*)\s*:/gm;
    let kMatch: RegExpExecArray | null;
    while ((kMatch = keyRegex.exec(targetBlock)) !== null) {
      if (kMatch[1]) {
        usedVars.add(kMatch[1]);
        const locs = varLocations.get(kMatch[1]) || [];
        locs.push(backendEnvFile);
        varLocations.set(kMatch[1], locs);
      }
    }
  }

  // Also parse Zod schema keys in apps/web/src/lib/env.ts
  const frontendEnvFile = join(root, "apps", "web", "src", "lib", "env.ts");
  if (existsSync(frontendEnvFile)) {
    const content = readFileSync(frontendEnvFile, "utf-8");
    const keyRegex = /^\s*(NEXT_PUBLIC_[A-Za-z0-9_]+|INTERNAL_API_URL)\s*:/gm;
    let kMatch: RegExpExecArray | null;
    while ((kMatch = keyRegex.exec(content)) !== null) {
      if (kMatch[1]) {
        usedVars.add(kMatch[1]);
        const locs = varLocations.get(kMatch[1]) || [];
        locs.push(frontendEnvFile);
        varLocations.set(kMatch[1], locs);
      }
    }
  }

  // Scan compose and infra files as valid usage
  const composeFiles = [
    join(root, "docker-compose.yml"),
    join(root, "docker-compose.staging.yml"),
    join(root, "docker-compose.prod.yml"),
    join(root, "docker-compose.dev.yml"),
  ];
  for (const cFile of composeFiles) {
    if (existsSync(cFile)) {
      const vars = extractComposeVariables(cFile);
      for (const v of vars) {
        usedVars.add(v);
        const locs = varLocations.get(v) || [];
        locs.push(cFile);
        varLocations.set(v, locs);
      }
    }
  }

  return { usedVars, varLocations };
}

function auditComposeTemplateCoverage(
  composeFile: string,
  templateFile: string,
): boolean {
  const composePath = resolve(process.cwd(), composeFile);
  const templatePath = resolve(process.cwd(), templateFile);
  if (!existsSync(composePath)) return true;

  const { required, defaulted, all } =
    extractComposeVariableDetails(composePath);
  const activeKeys = parseEnvKeys(templatePath) || new Set<string>();
  const documentedKeys =
    parseDocumentedEnvKeys(templatePath) || new Set<string>();

  const missingRequired = Array.from(required).filter(
    (v) => !activeKeys.has(v),
  );
  const missingDocumented = Array.from(defaulted).filter(
    (v) => !documentedKeys.has(v),
  );

  let ok = true;
  if (missingRequired.length > 0) {
    console.error(
      `❌ Required variables in ${composeFile} are missing (active) in ${templateFile}:`,
    );
    for (const v of missingRequired) {
      console.error(`   - \${${v}}`);
    }
    ok = false;
  }
  if (missingDocumented.length > 0) {
    console.error(
      `❌ Defaulted variables in ${composeFile} are undocumented in ${templateFile}:`,
    );
    for (const v of missingDocumented) {
      console.error(`   - \${${v}}`);
    }
    ok = false;
  }
  if (ok) {
    console.log(
      `✅ All ${all.size} variables in ${composeFile} are covered by ${templateFile} (${required.size} required active, ${defaulted.size} defaulted documented)`,
    );
  }
  return ok;
}

export function runEnvSyncAudit(): boolean {
  console.log(
    "==================================================================",
  );
  console.log("🔍 CI ARCHITECTURE GATE: ENVIRONMENT SYNCHRONIZATION AUDIT");
  console.log(
    "==================================================================",
  );

  let hasError = false;

  // 1. Audit pairwise parity (.env vs .env.example, .env.staging vs .env.staging.example, .env.production vs .env.production.example)
  const envPairs: EnvPairCheck[] = [
    {
      name: "Development Environment Single Source of Truth",
      exampleFile: ".env.example",
      targetFile: ".env",
      requiredTarget: false,
    },
    {
      name: "Staging Environment Template Parity",
      exampleFile: ".env.staging.example",
      targetFile: ".env.staging",
      requiredTarget: false,
    },
    {
      name: "Production Environment Template Parity",
      exampleFile: ".env.production.example",
      targetFile: ".env.production",
      requiredTarget: false,
    },
  ];

  for (const pair of envPairs) {
    const examplePath = resolve(process.cwd(), pair.exampleFile);
    const targetPath = resolve(process.cwd(), pair.targetFile);

    const activeExampleKeys = parseEnvKeys(examplePath);
    const documentedExampleKeys = parseDocumentedEnvKeys(examplePath);
    if (!activeExampleKeys || !documentedExampleKeys) {
      console.error(
        `❌ [${pair.name}] Missing example template file: ${pair.exampleFile}`,
      );
      hasError = true;
      continue;
    }

    const targetKeys = parseEnvKeys(targetPath);
    if (!targetKeys) {
      console.log(
        `ℹ️ [${pair.name}] Target ${pair.targetFile} not present (skipping key comparison)`,
      );
      continue;
    }

    const missingInTarget = Array.from(activeExampleKeys).filter(
      (k) => !targetKeys.has(k),
    );
    const extraInTarget = Array.from(targetKeys).filter(
      (k) => !documentedExampleKeys.has(k),
    );

    if (missingInTarget.length > 0) {
      console.error(
        `❌ [${pair.name}] Missing required keys in ${pair.targetFile} compared to ${pair.exampleFile}:`,
      );
      for (const key of missingInTarget) {
        console.error(`   - ${key}`);
      }
      hasError = true;
    }

    if (extraInTarget.length > 0) {
      console.error(
        `❌ [${pair.name}] Undocumented keys in ${pair.targetFile} not documented in ${pair.exampleFile}:`,
      );
      for (const key of extraInTarget) {
        console.error(`   + ${key}`);
      }
      hasError = true;
    }

    if (missingInTarget.length === 0 && extraInTarget.length === 0) {
      const optionalOverrideCount = Array.from(targetKeys).filter(
        (k) => !activeExampleKeys.has(k),
      ).length;
      const suffix =
        optionalOverrideCount > 0
          ? ` + ${optionalOverrideCount} documented optional overrides`
          : "";
      console.log(
        `✅ [${pair.name}] Sync verified (${activeExampleKeys.size}/${activeExampleKeys.size} core keys${suffix})`,
      );
    }
  }

  // 2. Audit Docker Compose variables against Staging & Production templates
  console.log(
    "\n------------------------------------------------------------------",
  );
  console.log("🐳 Verifying Staging & Production Docker Compose Coverage");
  console.log(
    "------------------------------------------------------------------",
  );

  if (
    !auditComposeTemplateCoverage(
      "docker-compose.staging.yml",
      ".env.staging.example",
    )
  ) {
    hasError = true;
  }
  if (
    !auditComposeTemplateCoverage(
      "docker-compose.prod.yml",
      ".env.production.example",
    )
  ) {
    hasError = true;
  }

  // 3. Local .env Internal Coherence Check
  console.log(
    "\n------------------------------------------------------------------",
  );
  console.log("🔗 Verifying Internal Port & URL Coherence in Local .env");
  console.log(
    "------------------------------------------------------------------",
  );

  const rootEnv = parseEnvKeyValueMap(resolve(process.cwd(), ".env"));

  if (rootEnv.size > 0) {
    const backendPort = rootEnv.get("BACKEND_PORT") || "3001";
    const publicPort =
      rootEnv.get("GATEWAY_PORT") || rootEnv.get("FRONTEND_PORT");
    const internalApiUrl = rootEnv.get("INTERNAL_API_URL") || "";
    const frontendUrl = rootEnv.get("FRONTEND_URL") || "";

    if (internalApiUrl) {
      if (!internalApiUrl.includes(`:${backendPort}`)) {
        console.warn(
          `⚠️ Warning: INTERNAL_API_URL (${internalApiUrl}) does not match BACKEND_PORT (${backendPort})`,
        );
      } else {
        console.log(
          `✅ Internal API URL correctly targets backend port ${backendPort}`,
        );
      }
    } else {
      console.log(
        `✅ Internal API URL defaults automatically to http://127.0.0.1:${backendPort}`,
      );
    }

    if (publicPort && frontendUrl && !frontendUrl.includes(`:${publicPort}`)) {
      console.warn(
        `⚠️ Warning: FRONTEND_URL (${frontendUrl}) does not match public port ${publicPort}`,
      );
    } else {
      console.log(
        `✅ Frontend URL correctly targets public port ${publicPort}`,
      );
    }
  } else {
    console.log("ℹ️ Internal coherence check skipped (local .env not present)");
  }

  // 4. Two-Way Codebase vs .env.example Audit
  console.log(
    "\n------------------------------------------------------------------",
  );
  console.log("🔎 Verifying Two-Way Sync Between Codebase & .env.example");
  console.log(
    "------------------------------------------------------------------",
  );

  const devExamplePath = resolve(process.cwd(), ".env.example");
  const devActiveKeys = parseEnvKeys(devExamplePath) || new Set<string>();
  const devDocumentedKeys =
    parseDocumentedEnvKeys(devExamplePath) || new Set<string>();
  const { usedVars } = scanCodebaseEnvVariables();

  // (a) Missing in .env.example: Variables used in code/infra must be documented (active or optional override)
  const missingInExample = Array.from(usedVars).filter(
    (v) => !devDocumentedKeys.has(v),
  );
  if (missingInExample.length > 0) {
    console.error(
      "❌ The following environment variables are used in code/infra but MISSING from .env.example:",
    );
    for (const v of missingInExample) {
      console.error(`   - ${v}`);
    }
    hasError = true;
  } else {
    console.log(
      `✅ All ${usedVars.size} environment variables used across codebase/infra are documented in .env.example.`,
    );
  }

  // (b) Unused active keys: Every active key in .env.example should be actively used
  const unusedActiveInCode = Array.from(devActiveKeys).filter(
    (k) => !usedVars.has(k),
  );
  if (unusedActiveInCode.length > 0) {
    console.log(
      `ℹ️ [Notice] ${unusedActiveInCode.length} active keys in .env.example are not referenced directly in code/compose:`,
    );
    for (const k of unusedActiveInCode) {
      console.log(`   • ${k}`);
    }
  } else {
    console.log(
      `✅ Zero unused active variables in .env.example (${devActiveKeys.size}/${devActiveKeys.size} actively utilized).`,
    );
  }

  console.log(
    "==================================================================",
  );
  if (hasError) {
    console.error(
      "❌ CI Gate 'lint:env-sync' FAILED! Fix the missing or mismatched keys listed above.",
    );
    return false;
  } else {
    console.log(
      "✅ CI Gate 'lint:env-sync' PASSED! All environment definitions are synchronized.",
    );
    return true;
  }
}

if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("check-env-sync.ts")
) {
  const success = runEnvSyncAudit();
  process.exit(success ? 0 : 1);
}
