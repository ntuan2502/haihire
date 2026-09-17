import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const I18N_DIR = path.join(ROOT_DIR, "src", "i18n");
const TYPES_FILE = path.join(I18N_DIR, "types.ts");
const VI_FILE = path.join(I18N_DIR, "locales", "vi.ts");
const EN_FILE = path.join(I18N_DIR, "locales", "en.ts");

function parseKeysFromObjectFile(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const stack: string[] = [];
  const keys = new Set<string>();

  for (let line of lines) {
    line = line.replace(/\/\/.*$/, "").trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;

    const block = trimmed.match(/^([a-zA-Z0-9_]+)\s*:\s*\{/);
    if (block) {
      stack.push(block[1]);
      continue;
    }

    if (trimmed.startsWith("}") || trimmed.startsWith("};")) {
      stack.pop();
      continue;
    }

    const prop = trimmed.match(/^([a-zA-Z0-9_]+)\??\s*:/);
    if (prop) {
      keys.add([...stack, prop[1]].join("."));
    }
  }

  return keys;
}

function parseKeysFromTypesFile(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const stack: string[] = [];
  const keys = new Set<string>();

  for (let line of lines) {
    line = line.replace(/\/\/.*$/, "").trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;

    const block = trimmed.match(/^([a-zA-Z0-9_]+)\s*:\s*\{/);
    if (block) {
      stack.push(block[1]);
      continue;
    }

    if (trimmed.startsWith("}") || trimmed.startsWith("};")) {
      stack.pop();
      continue;
    }

    const prop = trimmed.match(/^([a-zA-Z0-9_]+)\??\s*:\s*string/);
    if (prop) {
      keys.add([...stack, prop[1]].join("."));
    }
  }

  return keys;
}

function walkSourceFiles(dir: string): string[] {
  let files: string[] = [];
  const list = fs.readdirSync(dir);

  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (item === "node_modules" || item === ".next") continue;
      files = files.concat(walkSourceFiles(fullPath));
    } else if (item.endsWith(".tsx") || item.endsWith(".ts")) {
      if (!item.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function main(): void {
  console.log("\n🔍 Running ATS i18n Verification Check...\n");

  const schemaKeys = parseKeysFromTypesFile(TYPES_FILE);
  const viKeys = parseKeysFromObjectFile(VI_FILE);
  const enKeys = parseKeysFromObjectFile(EN_FILE);

  console.log(`  • TranslationSchema: ${schemaKeys.size} defined keys`);
  console.log(`  • Vietnamese (vi):    ${viKeys.size} keys`);
  console.log(`  • English (en):       ${enKeys.size} keys\n`);

  let errors = 0;

  // 1. Check Schema vs Locales consistency
  const missingInViFromSchema: string[] = [];
  const missingInEnFromSchema: string[] = [];

  for (const key of schemaKeys) {
    if (!viKeys.has(key)) missingInViFromSchema.push(key);
    if (!enKeys.has(key)) missingInEnFromSchema.push(key);
  }

  if (missingInViFromSchema.length > 0) {
    console.error(`❌ Missing in Vietnamese (vi.ts) but present in types.ts (${missingInViFromSchema.length}):`);
    missingInViFromSchema.forEach((k) => console.error(`   - ${k}`));
    errors += missingInViFromSchema.length;
  }

  if (missingInEnFromSchema.length > 0) {
    console.error(`❌ Missing in English (en.ts) but present in types.ts (${missingInEnFromSchema.length}):`);
    missingInEnFromSchema.forEach((k) => console.error(`   - ${k}`));
    errors += missingInEnFromSchema.length;
  }

  // 2. Scan code usage
  const srcFiles = walkSourceFiles(path.join(ROOT_DIR, "src"));
  const tCallRegex = /\bt\(\s*["']([^"'\n]+)["']/g;
  const missingInCode = new Map<
    string,
    { file: string; notInSchema: boolean; notInVi: boolean; notInEn: boolean }
  >();

  for (const file of srcFiles) {
    if (file.includes(path.join("src", "i18n"))) continue;

    const content = fs.readFileSync(file, "utf-8");
    let match: RegExpExecArray | null;

    while ((match = tCallRegex.exec(content)) !== null) {
      const key = match[1];

      // Ignore dynamic keys or URLs/symbols that aren't translation keys
      if (key.includes("${") || key.includes("+") || key.startsWith("http") || key.length === 1) {
        continue;
      }

      const notInSchema = !schemaKeys.has(key);
      const notInVi = !viKeys.has(key);
      const notInEn = !enKeys.has(key);

      if (notInSchema || notInVi || notInEn) {
        if (!missingInCode.has(key)) {
          missingInCode.set(key, {
            file: path.relative(ROOT_DIR, file),
            notInSchema,
            notInVi,
            notInEn,
          });
        }
      }
    }
  }

  if (missingInCode.size > 0) {
    console.error(`❌ Found ${missingInCode.size} translation key(s) called in code that are missing in dictionary:`);
    for (const [key, details] of missingInCode.entries()) {
      const missingWhere = [
        details.notInSchema ? "types.ts" : null,
        details.notInVi ? "vi.ts" : null,
        details.notInEn ? "en.ts" : null,
      ]
        .filter(Boolean)
        .join(", ");
      console.error(`   - "${key}" (missing in: ${missingWhere})`);
      console.error(`     at ${details.file}`);
    }
    errors += missingInCode.size;
  }

  if (errors > 0) {
    console.error(`\n❌ i18n Check FAILED with ${errors} total issue(s).\n`);
    process.exit(1);
  }

  console.log("✅ All i18n keys are 100% consistent across code, types.ts, vi.ts, and en.ts!\n");
  process.exit(0);
}

main();
