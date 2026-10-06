#!/usr/bin/env tsx
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface EnvPairCheck {
  name: string;
  exampleFile: string;
  targetFile: string;
  requiredTarget?: boolean;
}

function parseEnvKeys(filePath: string): Set<string> | null {
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

function parseEnvKeyValueMap(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(filePath)) return map;
  const content = readFileSync(filePath, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && match[1]) {
      let val = match[2] || "";
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      map.set(match[1], val);
    }
  }
  return map;
}

function extractComposeVariables(filePath: string): Set<string> {
  if (!existsSync(filePath)) return new Set();
  const content = readFileSync(filePath, "utf-8");
  const vars = new Set<string>();
  // Match ${VAR} or ${VAR:-default} but ignore $$VAR (escaped for shell)
  const regex = /(?<!\$)\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      vars.add(match[1]);
    }
  }
  return vars;
}

console.log("==================================================================");
console.log("🔍 CI ARCHITECTURE GATE: ENVIRONMENT SYNCHRONIZATION AUDIT");
console.log("==================================================================");

let hasError = false;

// 1. Audit pairwise parity (.env vs .env.example)
const envPairs: EnvPairCheck[] = [
  {
    name: "Root System Ports & Infrastructure",
    exampleFile: ".env.example",
    targetFile: ".env",
    requiredTarget: false, // in CI, .env might be generated dynamically
  },
  {
    name: "Backend Service Environment",
    exampleFile: "backend/.env.example",
    targetFile: "backend/.env",
    requiredTarget: true,
  },
  {
    name: "Frontend Service Environment",
    exampleFile: "frontend/.env.example",
    targetFile: "frontend/.env",
    requiredTarget: true,
  },
  {
    name: "Production Template Parity",
    exampleFile: ".env.production.example",
    targetFile: ".env.production",
    requiredTarget: false,
  },
];

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

for (const pair of envPairs) {
  const examplePath = resolve(process.cwd(), pair.exampleFile);
  const targetPath = resolve(process.cwd(), pair.targetFile);

  const exampleKeys = parseEnvKeys(examplePath);
  if (!exampleKeys) {
    console.error(`❌ [${pair.name}] Missing example template file: ${pair.exampleFile}`);
    hasError = true;
    continue;
  }

  const targetKeys = parseEnvKeys(targetPath);
  if (!targetKeys) {
    if (isCI) {
      console.log(`ℹ️ [SKIP] ${pair.targetFile} not present in CI environment`);
    } else if (pair.requiredTarget) {
      console.error(`❌ [${pair.name}] Required environment file missing: ${pair.targetFile}`);
      hasError = true;
    } else {
      console.log(`ℹ️ [${pair.name}] Target ${pair.targetFile} not present (skipping key comparison)`);
    }
    continue;
  }

  const missingInTarget = Array.from(exampleKeys).filter((k) => !targetKeys.has(k));
  const extraInTarget = Array.from(targetKeys).filter((k) => !exampleKeys.has(k));

  if (missingInTarget.length > 0) {
    console.error(`❌ [${pair.name}] Missing keys in ${pair.targetFile} compared to ${pair.exampleFile}:`);
    for (const key of missingInTarget) {
      console.error(`   - ${key}`);
    }
    hasError = true;
  }

  if (extraInTarget.length > 0) {
    console.error(`❌ [${pair.name}] Undocumented keys in ${pair.targetFile} not present in ${pair.exampleFile}:`);
    for (const key of extraInTarget) {
      console.error(`   + ${key}`);
    }
    hasError = true;
  }

  if (missingInTarget.length === 0 && extraInTarget.length === 0) {
    console.log(`✅ [${pair.name}] 100% key parity verified (${exampleKeys.size}/${exampleKeys.size} keys match)`);
  }
}

// 2. Audit docker-compose.prod.yml variables against .env.production.example
console.log("\n------------------------------------------------------------------");
console.log("🐳 Verifying Production Docker Compose Variable Coverage");
console.log("------------------------------------------------------------------");

const prodComposePath = resolve(process.cwd(), "docker-compose.prod.yml");
const prodExamplePath = resolve(process.cwd(), ".env.production.example");

const prodComposeVars = extractComposeVariables(prodComposePath);
const prodExampleKeys = parseEnvKeys(prodExamplePath) || new Set<string>();

const unprovidedComposeVars = Array.from(prodComposeVars).filter(
  (v) => !prodExampleKeys.has(v)
);

if (unprovidedComposeVars.length > 0) {
  console.error("❌ The following variables are referenced in docker-compose.prod.yml but missing in .env.production.example:");
  for (const v of unprovidedComposeVars) {
    console.error(`   - \${${v}}`);
  }
  hasError = true;
} else {
  console.log(`✅ All ${prodComposeVars.size} variables in docker-compose.prod.yml are documented in .env.production.example`);
}

// 3. Cross-file consistency checks (Dev mode alignment)
console.log("\n------------------------------------------------------------------");
console.log("🔗 Verifying Cross-File Port & Host Consistency (Dev Alignment)");
console.log("------------------------------------------------------------------");

const rootEnv = parseEnvKeyValueMap(resolve(process.cwd(), ".env"));
const backendEnv = parseEnvKeyValueMap(resolve(process.cwd(), "backend/.env"));
const frontendEnv = parseEnvKeyValueMap(resolve(process.cwd(), "frontend/.env"));

if (rootEnv.size > 0 && backendEnv.size > 0 && frontendEnv.size > 0) {
  const rootBackendPort = rootEnv.get("BACKEND_PORT");
  const backendPort = backendEnv.get("PORT");
  const rootFrontendPort = rootEnv.get("FRONTEND_PORT");
  const frontendPort = frontendEnv.get("PORT");
  const rootPostgresPort = rootEnv.get("POSTGRES_PORT");
  const backendDbUrl = backendEnv.get("DATABASE_URL") || "";

  if (rootBackendPort && backendPort && rootBackendPort !== backendPort) {
    console.warn(`⚠️ Port discrepancy: root BACKEND_PORT (${rootBackendPort}) != backend PORT (${backendPort}). Note: backend/src/config/env.ts will automatically prioritize root BACKEND_PORT.`);
  } else {
    console.log(`✅ Backend port aligned: ${backendPort || rootBackendPort}`);
  }

  if (rootFrontendPort && frontendPort && rootFrontendPort !== frontendPort) {
    console.warn(`⚠️ Port discrepancy: root FRONTEND_PORT (${rootFrontendPort}) != frontend PORT (${frontendPort}).`);
  } else {
    console.log(`✅ Frontend port aligned: ${frontendPort || rootFrontendPort}`);
  }

  if (rootPostgresPort && !backendDbUrl.includes(`:${rootPostgresPort}/`)) {
    console.warn(`⚠️ Database port note: backend DATABASE_URL doesn't explicitly mention host port ${rootPostgresPort}. Note: backend/src/config/env.ts overrides host port dynamically.`);
  } else {
    console.log(`✅ Database port aligned with host: ${rootPostgresPort}`);
  }
} else {
  console.log("ℹ️ Cross-file dev alignment skipped (one or more local .env files absent in CI environment).");
}

console.log("==================================================================");
if (hasError) {
  console.error("❌ CI Gate 'lint:env-sync' FAILED! Fix the missing or mismatched keys listed above.");
  process.exit(1);
} else {
  console.log("✅ CI Gate 'lint:env-sync' PASSED! All environment definitions are synchronized.");
  process.exit(0);
}
