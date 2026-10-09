import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface EnvCheckTarget {
  name: string;
  exampleFile: string;
  targetFile: string;
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

const checks: EnvCheckTarget[] = [
  {
    name: "Unified Environment",
    exampleFile: ".env.example",
    targetFile: ".env",
  },
];

console.log("=================================================");
console.log("🔍 Checking Environment Variables Synchronization");
console.log("=================================================");

let hasError = false;

for (const check of checks) {
  const examplePath = resolve(process.cwd(), check.exampleFile);
  const targetPath = resolve(process.cwd(), check.targetFile);

  const exampleKeys = parseEnvKeys(examplePath);
  const targetKeys = parseEnvKeys(targetPath);

  if (!exampleKeys) {
    console.error(`❌ Missing example file: ${check.exampleFile}`);
    hasError = true;
    continue;
  }

  if (!targetKeys) {
    console.warn(
      `⚠️ Warning: ${check.targetFile} does not exist yet. Please copy from ${check.exampleFile}`,
    );
    hasError = true;
    continue;
  }

  const missingInTarget = Array.from(exampleKeys).filter((k) => !targetKeys.has(k));
  const extraInTarget = Array.from(targetKeys).filter((k) => !exampleKeys.has(k));

  if (missingInTarget.length > 0) {
    console.error(
      `❌ [${check.name}] Missing keys in ${check.targetFile} compared to ${check.exampleFile}:`,
    );
    for (const key of missingInTarget) {
      console.error(`   - ${key}`);
    }
    hasError = true;
  }

  if (extraInTarget.length > 0) {
    console.warn(
      `⚠️ [${check.name}] Extra keys in ${check.targetFile} not documented in ${check.exampleFile}:`,
    );
    for (const key of extraInTarget) {
      console.warn(`   + ${key}`);
    }
  }

  if (missingInTarget.length === 0 && extraInTarget.length === 0) {
    console.log(
      `✅ [${check.name}] 100% in sync (${exampleKeys.size}/${exampleKeys.size} keys match)`,
    );
  }
}

console.log("=================================================");
if (hasError) {
  console.error("❌ Environment check failed! Please synchronize .env and .env.example files.");
  process.exit(1);
} else {
  console.log("✨ All environment variables are completely synchronized and documented!");
  process.exit(0);
}
