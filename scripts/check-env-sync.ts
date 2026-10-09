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

// 1. Audit pairwise parity (.env vs .env.example, .env.production vs .env.production.example)
const envPairs: EnvPairCheck[] = [
  {
    name: "Development Environment Single Source of Truth",
    exampleFile: ".env.example",
    targetFile: ".env",
    requiredTarget: false, // in CI without local setup, .env is tested if generated
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
    console.error(`❌ [${pair.name}] Missing example template file: ${pair.exampleFile}`);
    hasError = true;
    continue;
  }

  const targetKeys = parseEnvKeys(targetPath);
  if (!targetKeys) {
    console.log(`ℹ️ [${pair.name}] Target ${pair.targetFile} not present (skipping key comparison)`);
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

// 3. Local .env Internal Coherence Check
console.log("\n------------------------------------------------------------------");
console.log("🔗 Verifying Internal Port & URL Coherence in Local .env");
console.log("------------------------------------------------------------------");

const rootEnv = parseEnvKeyValueMap(resolve(process.cwd(), ".env"));

if (rootEnv.size > 0) {
  const backendPort = rootEnv.get("BACKEND_PORT");
  const frontendPort = rootEnv.get("FRONTEND_PORT");
  const internalApiUrl = rootEnv.get("INTERNAL_API_URL") || "";
  const frontendUrl = rootEnv.get("FRONTEND_URL") || "";

  if (backendPort && internalApiUrl && !internalApiUrl.includes(`:${backendPort}`)) {
    console.warn(`⚠️ Warning: INTERNAL_API_URL (${internalApiUrl}) does not match BACKEND_PORT (${backendPort})`);
  } else {
    console.log(`✅ Internal API URL correctly targets backend port ${backendPort}`);
  }

  if (frontendPort && frontendUrl && !frontendUrl.includes(`:${frontendPort}`)) {
    console.warn(`⚠️ Warning: FRONTEND_URL (${frontendUrl}) does not match FRONTEND_PORT (${frontendPort})`);
  } else {
    console.log(`✅ Frontend URL correctly targets frontend port ${frontendPort}`);
  }
} else {
  console.log("ℹ️ Internal coherence check skipped (local .env not present)");
}

console.log("==================================================================");
if (hasError) {
  console.error("❌ CI Gate 'lint:env-sync' FAILED! Fix the missing or mismatched keys listed above.");
  process.exit(1);
} else {
  console.log("✅ CI Gate 'lint:env-sync' PASSED! All environment definitions are synchronized.");
  process.exit(0);
}
