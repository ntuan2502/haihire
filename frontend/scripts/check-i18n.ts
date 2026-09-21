import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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
      if (item === "node_modules" || item === ".next" || item === "ui") continue;
      files = files.concat(walkSourceFiles(fullPath));
    } else if (item.endsWith(".tsx") || item.endsWith(".ts")) {
      if (!item.endsWith(".d.ts") && !item.endsWith(".spec.tsx") && !item.endsWith(".spec.ts")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// Allowed brand names, abbreviations, and symbols in JSX
const ALLOWED_LITERALS = new Set([
  "ATS",
  "ATS Platform",
  "ATS Careers",
  "MB",
  "AD",
  "Beta",
  "&bull;",
  "&rarr;",
  "&larr;",
  "&ldquo;",
  "&rdquo;",
  "&lt;",
  "&gt;",
  "(TLS/SSL)",
  "HTML / Template Variables",
]);

interface HardcodedHit {
  file: string;
  line: number;
  text: string;
}

function scanHardcodedJsx(srcFiles: string[]): HardcodedHit[] {
  const hits: HardcodedHit[] = [];

  for (const file of srcFiles) {
    if (!file.endsWith(".tsx")) continue;
    if (file.includes(path.join("src", "i18n"))) continue;

    const content = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        const text = node.getText(sf).trim();
        // Ignore empty, symbols, single characters or allowed brand tokens
        if (text && /[a-zA-Z]{2,}/.test(text) && !ALLOWED_LITERALS.has(text)) {
          // Check if it's more than just technical characters or paths
          if (!text.startsWith("/") && !text.startsWith("http") && !text.startsWith("{") && !text.startsWith("•")) {
            // Words check: contains real words (e.g. 2 or more letters)
            if (/[a-zA-Z]{3,}\s+[a-zA-Z]{2,}/.test(text) || (text.length > 8 && !/^[A-Z0-9_.-]+$/.test(text))) {
              const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
              hits.push({ file: path.relative(ROOT_DIR, file), line: line + 1, text });
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sf);
  }

  return hits;
}

function main(): void {
  console.log("\n🔍 Running ATS Two-Way i18n Verification Check...\n");

  const schemaKeys = parseKeysFromTypesFile(TYPES_FILE);
  const viKeys = parseKeysFromObjectFile(VI_FILE);
  const enKeys = parseKeysFromObjectFile(EN_FILE);

  console.log(`  • TranslationSchema: ${schemaKeys.size} defined keys`);
  console.log(`  • Vietnamese (vi):    ${viKeys.size} keys`);
  console.log(`  • English (en):       ${enKeys.size} keys\n`);

  let errors = 0;

  // 1. Direction 1A: Check Schema vs Locales consistency
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

  // 2. Direction 1B: Scan code usage for missing dictionary keys
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

  // 3. Direction 2: Scan for untranslated raw JSX text
  const hardcodedHits = scanHardcodedJsx(srcFiles);
  if (hardcodedHits.length > 0) {
    console.error(`❌ Found ${hardcodedHits.length} hardcoded text string(s) bypassing i18n in JSX:`);
    for (const h of hardcodedHits) {
      console.error(`   - "${h.text}" at ${h.file}:${h.line}`);
    }
    errors += hardcodedHits.length;
  }

  if (errors > 0) {
    console.error(`\n❌ Two-Way i18n Check FAILED with ${errors} total issue(s).\n`);
    process.exit(1);
  }

  console.log("✅ Direction 1: All dictionary keys and t() calls are 100% consistent!");
  console.log("✅ Direction 2: Zero hardcoded text found in JSX components!");
  console.log("🎉 Two-Way i18n Verification PASSED 100%!\n");
  process.exit(0);
}

main();
