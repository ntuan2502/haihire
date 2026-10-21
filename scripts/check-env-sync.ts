#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";

export interface EnvPairCheck {
  name: string;
  exampleFile: string;
  targetFile: string;
  requiredTarget?: boolean;
}

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

export function extractComposeVariables(filePath: string): Set<string> {
  if (!existsSync(filePath)) return new Set();
  const content = readFileSync(filePath, "utf-8");
  const vars = new Set<string>();
  const regex = /(?<!\$)\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      vars.add(match[1]);
    }
  }
  return vars;
}

const OS_PLATFORM_VARS = new Set([
  "CI",
  "CONTINUOUS_INTEGRATION",
  "GITHUB_ACTIONS",
  "GITHUB_ACTOR",
  "GITHUB_REPOSITORY",
  "GITHUB_REF",
  "GITHUB_SHA",
  "PLAYWRIGHT_BASE_URL",
  "BASE_URL",
  "NEXT_TELEMETRY_DISABLED",
  "VITE_CJS_IGNORE_WARNING",
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

  collectFiles(join(root, "backend", "src"), [".ts"], files);
  collectFiles(join(root, "frontend", "src"), [".ts", ".tsx"], files);
  collectFiles(join(root, "packages"), [".ts"], files);
  collectFiles(join(root, "scripts"), [".ts"], files);

  const individualFiles = [
    join(root, "frontend", "next.config.ts"),
    join(root, "backend", "vitest.config.ts"),
    join(root, "frontend", "vitest.config.mts"),
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

  // Also parse Zod schema keys in backend/src/config/env.ts
  const backendEnvFile = join(root, "backend", "src", "config", "env.ts");
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

  // Also parse Zod schema keys in frontend/src/lib/env.ts
  const frontendEnvFile = join(root, "frontend", "src", "lib", "env.ts");
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

export function runEnvSyncAudit(): boolean {
  console.log(
    "==================================================================",
  );
  console.log("🔍 CI ARCHITECTURE GATE: ENVIRONMENT SYNCHRONIZATION AUDIT");
  console.log(
    "==================================================================",
  );

  let hasError = false;

  // 1. Audit pairwise parity (.env vs .env.example, .env.production vs .env.production.example)
  const envPairs: EnvPairCheck[] = [
    {
      name: "Development Environment Single Source of Truth",
      exampleFile: ".env.example",
      targetFile: ".env",
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

    const exampleKeys = parseEnvKeys(examplePath);
    if (!exampleKeys) {
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

    const missingInTarget = Array.from(exampleKeys).filter(
      (k) => !targetKeys.has(k),
    );
    const extraInTarget = Array.from(targetKeys).filter(
      (k) => !exampleKeys.has(k),
    );

    if (missingInTarget.length > 0) {
      console.error(
        `❌ [${pair.name}] Missing keys in ${pair.targetFile} compared to ${pair.exampleFile}:`,
      );
      for (const key of missingInTarget) {
        console.error(`   - ${key}`);
      }
      hasError = true;
    }

    if (extraInTarget.length > 0) {
      console.error(
        `❌ [${pair.name}] Undocumented keys in ${pair.targetFile} not present in ${pair.exampleFile}:`,
      );
      for (const key of extraInTarget) {
        console.error(`   + ${key}`);
      }
      hasError = true;
    }

    if (missingInTarget.length === 0 && extraInTarget.length === 0) {
      console.log(
        `✅ [${pair.name}] 100% key parity verified (${exampleKeys.size}/${exampleKeys.size} keys match)`,
      );
    }
  }

  // 2. Audit docker-compose.prod.yml variables against .env.production.example
  console.log(
    "\n------------------------------------------------------------------",
  );
  console.log("🐳 Verifying Production Docker Compose Variable Coverage");
  console.log(
    "------------------------------------------------------------------",
  );

  const prodComposePath = resolve(process.cwd(), "docker-compose.prod.yml");
  const prodExamplePath = resolve(process.cwd(), ".env.production.example");

  const prodComposeVars = extractComposeVariables(prodComposePath);
  const prodExampleKeys = parseEnvKeys(prodExamplePath) || new Set<string>();

  const unprovidedComposeVars = Array.from(prodComposeVars).filter(
    (v) => !prodExampleKeys.has(v),
  );

  if (unprovidedComposeVars.length > 0) {
    console.error(
      "❌ The following variables are referenced in docker-compose.prod.yml but missing in .env.production.example:",
    );
    for (const v of unprovidedComposeVars) {
      console.error(`   - \${${v}}`);
    }
    hasError = true;
  } else {
    console.log(
      `✅ All ${prodComposeVars.size} variables in docker-compose.prod.yml are documented in .env.production.example`,
    );
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
    const backendPort = rootEnv.get("BACKEND_PORT");
    const frontendPort = rootEnv.get("FRONTEND_PORT");
    const internalApiUrl = rootEnv.get("INTERNAL_API_URL") || "";
    const frontendUrl = rootEnv.get("FRONTEND_URL") || "";

    if (
      backendPort &&
      internalApiUrl &&
      !internalApiUrl.includes(`:${backendPort}`)
    ) {
      console.warn(
        `⚠️ Warning: INTERNAL_API_URL (${internalApiUrl}) does not match BACKEND_PORT (${backendPort})`,
      );
    } else {
      console.log(
        `✅ Internal API URL correctly targets backend port ${backendPort}`,
      );
    }

    if (
      frontendPort &&
      frontendUrl &&
      !frontendUrl.includes(`:${frontendPort}`)
    ) {
      console.warn(
        `⚠️ Warning: FRONTEND_URL (${frontendUrl}) does not match FRONTEND_PORT (${frontendPort})`,
      );
    } else {
      console.log(
        `✅ Frontend URL correctly targets frontend port ${frontendPort}`,
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
  const devExampleKeys = parseEnvKeys(devExamplePath) || new Set<string>();
  const { usedVars } = scanCodebaseEnvVariables();

  // (a) Missing in .env.example: Variables used in code but not documented in .env.example
  const missingInExample = Array.from(usedVars).filter(
    (v) => !devExampleKeys.has(v),
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

  // (b) Unused in code: Variables declared in .env.example but never referenced in code/docker/infra
  const unusedInCode = Array.from(devExampleKeys).filter(
    (k) => !usedVars.has(k),
  );
  if (unusedInCode.length > 0) {
    console.log(
      `ℹ️ [Notice] ${unusedInCode.length} variables declared in .env.example are reserved or documentation-only:`,
    );
    for (const k of unusedInCode) {
      console.log(`   • ${k}`);
    }
  } else {
    console.log(
      "✅ Zero unused environment variables in .env.example (100% active utilization).",
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
