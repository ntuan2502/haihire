import fs from "node:fs";
import path from "node:path";

function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const keys = new Set();
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
}

const checks = [
  {
    name: "Backend Environment",
    exampleFile: "backend/.env.example",
    targetFile: "backend/.env",
  },
  {
    name: "Frontend Environment",
    exampleFile: "frontend/.env.example",
    targetFile: "frontend/.env",
  },
];

console.log("=================================================");
console.log("🔍 Checking Environment Variables Synchronization");
console.log("=================================================");

let hasError = false;

for (const check of checks) {
  const examplePath = path.resolve(process.cwd(), check.exampleFile);
  const targetPath = path.resolve(process.cwd(), check.targetFile);

  const exampleKeys = parseEnvKeys(examplePath);
  const targetKeys = parseEnvKeys(targetPath);

  if (!exampleKeys) {
    console.error(`❌ Missing example file: ${check.exampleFile}`);
    hasError = true;
    continue;
  }

  if (!targetKeys) {
    console.warn(`⚠️ Warning: ${check.targetFile} does not exist yet. Please copy from ${check.exampleFile}`);
    hasError = true;
    continue;
  }

  const missingInTarget = [...exampleKeys].filter((k) => !targetKeys.has(k));
  const extraInTarget = [...targetKeys].filter((k) => !exampleKeys.has(k));

  if (missingInTarget.length > 0) {
    console.error(`❌ [${check.name}] Missing keys in ${check.targetFile} compared to ${check.exampleFile}:`);
    for (const key of missingInTarget) {
      console.error(`   - ${key}`);
    }
    hasError = true;
  }

  if (extraInTarget.length > 0) {
    console.warn(`⚠️ [${check.name}] Extra keys in ${check.targetFile} not documented in ${check.exampleFile}:`);
    for (const key of extraInTarget) {
      console.warn(`   + ${key}`);
    }
  }

  if (missingInTarget.length === 0 && extraInTarget.length === 0) {
    console.log(`✅ [${check.name}] 100% in sync (${exampleKeys.size}/${exampleKeys.size} keys match)`);
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
