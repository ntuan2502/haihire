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
      if (item === "node_modules" || item === ".next" || item === "ui")
        continue;
      files = files.concat(walkSourceFiles(fullPath));
    } else if (item.endsWith(".tsx") || item.endsWith(".ts")) {
      if (
        !item.endsWith(".d.ts") &&
        !item.endsWith(".spec.tsx") &&
        !item.endsWith(".spec.ts")
      ) {
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
  "HaiHire",
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
]);

const UI_TEXT_ATTRS = new Set(["aria-label", "title", "placeholder", "alt"]);

// Server-rendered components intentionally kept non-localized or SEO-only
const ALLOWED_FALLBACK_FILES = new Map<string, Set<string>>([
  [
    path.join("src", "app", "layout.tsx"),
    new Set(["Skip to main content", "Bỏ qua đến nội dung chính"]),
  ],
  [
    path.join("src", "app", "careers", "[orgSlug]", "[jobSlug]", "page.tsx"),
    new Set(["Job Description", "Requirements"]),
  ],
]);

// Proper brand names, external services, and locale cities exempt from vi.ts leak detection
const ALLOWED_VI_PHRASES = [
  "HaiHire Recruitment Team",
  "Google Meet",
  "Zoom Meeting",
  "Microsoft Teams",
  "Google Jobs",
  "We Work Remotely",
  "Stack Overflow",
  "Google Workspace",
  "Ho Chi Minh",
  "Los Angeles",
  "New York",
  "Acme Corp",
  "Tran Minh Quan",
  "Senior FullStack",
  "Full-Stack",
  "Full Stack",
  "Nguyen Van A",
  "Nguyen An",
  "HaiHire",
];

const ALLOWED_VI_PARENS = new Set([
  "(SSO)",
  "(PDF/DOCX)",
  "(PDF)",
  "(CSV)",
  "(SMTP)",
  "(TLS/SSL)",
  "(ATS)",
  "(A - Z)",
]);

const ALLOWED_VI_ASCII_WORDS = new Set([
  "xem",
  "trang",
  "nam",
  "xong",
  "chung",
  "qua",
  "trong",
  "quy",
  "trinh",
  "cho",
  "moi",
  "sau",
  "hay",
  "tu",
  "cac",
  "tham",
  "gia",
  "an",
  "vd",
  "pv",
  "cv",
  "email",
  "resend",
  "sendgrid",
  "telegram",
  "discord",
  "linkedin",
  "indeed",
  "handshake",
  "reddit",
  "glassdoor",
  "facebook",
  "twitter",
  "webhooks",
  "cvr",
  "eur",
  "euro",
  "x",
  "acme",
  "corp",
  "ten",
  "to",
  "chuc",
  "pdf",
  "dd",
  "mm",
  "yyyy",
]);

const BANNED_VI_UI_WORDS =
  /(?<![\p{L}\p{N}])(Dashboard|Pipeline|Scorecard|Onboarding|Recruiter|Interviewer|Hiring Manager|Overview|Analytics|Candidate|Candidates|Application|Applications|Template|Templates|Settings|Loading|Failed|Success|Cancel|Submit|Unknown|Permission|Permissions|Admin|Owner|Manage|Workflow|Department|Career|Portal|Invite|Member|Members|Schedule|Organization|Workspace|Profile|Account|Password|Confirm|Welcome|Continue|Previous|Delete|Update|Create|Filter|Search|Preview|Download|Upload|Select|Please|Click|Invalid|Required|Optional|Remove|Close|Open|View|Offer|enter|please|select|click|delete|create|update|cancel|submit|loading|failed|invalid|required|optional|unknown|with|your|from|into|should|would|could)(?![\p{L}\p{N}])/u;
const PAREN_ENGLISH_RE = /\([A-Z][a-zA-Z\s/&-]{2,}\)/;
const VI_DIACRITIC_RE = /[\u00C0-\u024F\u1E00-\u1EFFđĐ]/;

interface HardcodedHit {
  file: string;
  line: number;
  text: string;
  context?: string;
}

interface ViLeakHit {
  key: string;
  line: number;
  text: string;
  reason: string;
}

function isTranslationCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  if (ts.isIdentifier(expr) && expr.text === "t") return true;
  if (ts.isPropertyAccessExpression(expr) && expr.name.text === "t") {
    return true;
  }
  return false;
}

function isNonUiToken(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || !/[a-zA-Z]{2,}/.test(trimmed)) return true;
  if (ALLOWED_LITERALS.has(trimmed)) return true;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("•")
  ) {
    return true;
  }
  // URL host/path segment prefixes such as "workspace/"
  if (/^[a-z0-9._-]+\/$/.test(trimmed)) return true;
  // Single lowercase identifier, kebab/dot token, or snake_case token
  if (/^[a-z][a-z0-9._-]*$/.test(trimmed)) return true;
  // Uppercase enum/abbreviation token
  if (/^[A-Z0-9_.-]+$/.test(trimmed)) return true;
  // Date/time placeholder token such as MM/DD/YYYY or HH:mm
  if (/^[DMYHms/:.\-\s]+$/.test(trimmed)) return true;
  // Example email token
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  // Masked API key placeholder (e.g. re_•••• or SG.••••)
  if (/^[a-zA-Z0-9_.-]+[•*]{3,}$/.test(trimmed)) return true;
  return false;
}

function collectNonTStringLiterals(
  root: ts.Node,
): Array<{ node: ts.Node; text: string }> {
  const results: Array<{ node: ts.Node; text: string }> = [];

  function walkNode(node: ts.Node): void {
    if (isTranslationCall(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      results.push({ node, text: node.text });
      return;
    }
    if (ts.isTemplateExpression(node)) {
      if (node.head.text.trim()) {
        results.push({ node, text: node.head.text });
      }
      for (const span of node.templateSpans) {
        walkNode(span.expression);
        if (span.literal.text.trim()) {
          results.push({ node, text: span.literal.text });
        }
      }
      return;
    }
    ts.forEachChild(node, walkNode);
  }

  walkNode(root);
  return results;
}

function collectFallbackStringLiterals(
  root: ts.Node,
): Array<{ node: ts.Node; text: string; kind: string }> {
  const results: Array<{ node: ts.Node; text: string; kind: string }> = [];

  function scan(node: ts.Node): void {
    if (isTranslationCall(node)) return;
    // Stop at nested JSX boundaries so child attributes (like className) are checked in their own scope.
    if (
      ts.isJsxAttribute(node) ||
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node)
    ) {
      return;
    }
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
    ) {
      scan(node.left);
      if (
        ts.isStringLiteral(node.right) ||
        ts.isNoSubstitutionTemplateLiteral(node.right)
      ) {
        results.push({
          node: node.right,
          text: node.right.text,
          kind: node.operatorToken.getText(),
        });
      } else {
        scan(node.right);
      }
      return;
    }
    if (ts.isConditionalExpression(node)) {
      for (const branch of [node.whenTrue, node.whenFalse]) {
        if (
          ts.isStringLiteral(branch) ||
          ts.isNoSubstitutionTemplateLiteral(branch)
        ) {
          results.push({ node: branch, text: branch.text, kind: "ternary" });
        } else {
          scan(branch);
        }
      }
      return;
    }
    ts.forEachChild(node, scan);
  }

  scan(root);
  return results;
}

function scanHardcodedJsx(srcFiles: string[]): {
  jsxHits: HardcodedHit[];
  attrHits: HardcodedHit[];
  fallbackHits: HardcodedHit[];
} {
  const jsxHits: HardcodedHit[] = [];
  const attrHits: HardcodedHit[] = [];
  const fallbackHits: HardcodedHit[] = [];

  for (const file of srcFiles) {
    if (!file.endsWith(".tsx")) continue;
    if (file.includes(path.join("src", "i18n"))) continue;

    const relFile = path.relative(ROOT_DIR, file);
    const allowedFallbacks = ALLOWED_FALLBACK_FILES.get(relFile);
    const content = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const recordHit = (
      target: HardcodedHit[],
      node: ts.Node,
      text: string,
      context?: string,
    ) => {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      target.push({ file: relFile, line: line + 1, text, context });
    };

    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        const text = node.getText(sf).trim();
        if (!isNonUiToken(text) && !allowedFallbacks?.has(text)) {
          if (
            /[a-zA-Z]{3,}\s+[a-zA-Z]{2,}/.test(text) ||
            (text.length > 8 && !/^[A-Z0-9_.-]+$/.test(text))
          ) {
            recordHit(jsxHits, node, text);
          }
        }
      } else if (ts.isJsxAttribute(node)) {
        const attrName = node.name.getText(sf);
        if (UI_TEXT_ATTRS.has(attrName) && node.initializer) {
          for (const lit of collectNonTStringLiterals(node.initializer)) {
            const text = lit.text.trim();
            if (!isNonUiToken(text) && !allowedFallbacks?.has(text)) {
              recordHit(attrHits, lit.node, text, attrName);
            }
          }
        }
      } else if (ts.isJsxExpression(node) && node.expression) {
        const parent = node.parent;
        const isVisibleChild =
          ts.isJsxElement(parent) || ts.isJsxFragment(parent);
        const isVisibleAttr =
          ts.isJsxAttribute(parent) &&
          UI_TEXT_ATTRS.has(parent.name.getText(sf));

        if (isVisibleChild || isVisibleAttr) {
          for (const hit of collectFallbackStringLiterals(node.expression)) {
            const text = hit.text.trim();
            if (!isNonUiToken(text) && !allowedFallbacks?.has(text)) {
              recordHit(fallbackHits, hit.node, text, hit.kind);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sf);
  }

  return { jsxHits, attrHits, fallbackHits };
}

/**
 * Detect leftover English UI words, parenthetical glosses, or untranslated ASCII strings in vi.ts.
 */
function scanVietnameseLocaleLeaks(filePath: string): ViLeakHit[] {
  const content = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const hits: ViLeakHit[] = [];

  function inspectEntry(key: string, node: ts.Node, text: string): void {
    let cleaned = text
      .replace(/\{[^}]+\}/g, " ")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, " ")
      .replace(/\b[a-zA-Z0-9_-]+\.(?:pdf|docx?|csv)\b/gi, " ")
      .replace(
        /\b(DD|MM|YYYY|HH|mm|ss)(?:[/: -](DD|MM|YYYY|HH|mm|ss))*\b/g,
        " ",
      );

    for (const phrase of ALLOWED_VI_PHRASES) {
      cleaned = cleaned.replaceAll(phrase, " ");
    }

    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    const parenMatch = cleaned.match(PAREN_ENGLISH_RE);
    if (parenMatch && !ALLOWED_VI_PARENS.has(parenMatch[0])) {
      hits.push({ key, line: line + 1, text, reason: parenMatch[0] });
      return;
    }

    const bannedMatch = cleaned.match(BANNED_VI_UI_WORDS);
    if (bannedMatch) {
      hits.push({ key, line: line + 1, text, reason: bannedMatch[0] });
      return;
    }

    if (!VI_DIACRITIC_RE.test(text) && /[a-zA-Z]{2,}/.test(cleaned)) {
      const words = cleaned.match(/[a-zA-Z]+/g) || [];
      const unexpected = words.filter(
        (w) => !ALLOWED_VI_ASCII_WORDS.has(w.toLowerCase()),
      );
      if (unexpected.length > 0) {
        hits.push({
          key,
          line: line + 1,
          text,
          reason: `untranslated ASCII: ${unexpected.join(", ")}`,
        });
      }
    }
  }

  function walkAst(node: ts.Node, keyPath: string[]): void {
    if (ts.isPropertyAssignment(node)) {
      const propName = node.name.getText(sf).replace(/['"]/g, "");
      const nextPath = [...keyPath, propName];
      if (
        ts.isStringLiteral(node.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer)
      ) {
        inspectEntry(
          nextPath.join("."),
          node.initializer,
          node.initializer.text,
        );
      } else {
        ts.forEachChild(node.initializer, (child) => walkAst(child, nextPath));
      }
      return;
    }
    ts.forEachChild(node, (child) => walkAst(child, keyPath));
  }

  walkAst(sf, []);
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
    console.error(
      `❌ Missing in Vietnamese (vi.ts) but present in types.ts (${missingInViFromSchema.length}):`,
    );
    missingInViFromSchema.forEach((k) => console.error(`   - ${k}`));
    errors += missingInViFromSchema.length;
  }

  if (missingInEnFromSchema.length > 0) {
    console.error(
      `❌ Missing in English (en.ts) but present in types.ts (${missingInEnFromSchema.length}):`,
    );
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
      if (
        key.includes("${") ||
        key.includes("+") ||
        key.startsWith("http") ||
        key.length === 1
      ) {
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
    console.error(
      `❌ Found ${missingInCode.size} translation key(s) called in code that are missing in dictionary:`,
    );
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

  // 3. Direction 2: Scan for untranslated raw JSX text, attributes, and fallbacks
  const { jsxHits, attrHits, fallbackHits } = scanHardcodedJsx(srcFiles);
  if (jsxHits.length > 0) {
    console.error(
      `❌ Found ${jsxHits.length} hardcoded text string(s) bypassing i18n in JSX:`,
    );
    for (const h of jsxHits) {
      console.error(`   - "${h.text}" at ${h.file}:${h.line}`);
    }
    errors += jsxHits.length;
  }

  if (attrHits.length > 0) {
    console.error(
      `❌ Found ${attrHits.length} hardcoded string(s) in UI JSX attributes (aria-label/title/placeholder/alt):`,
    );
    for (const h of attrHits) {
      console.error(`   - [${h.context}] "${h.text}" at ${h.file}:${h.line}`);
    }
    errors += attrHits.length;
  }

  if (fallbackHits.length > 0) {
    console.error(
      `❌ Found ${fallbackHits.length} hardcoded UI fallback expression(s) in JSX:`,
    );
    for (const h of fallbackHits) {
      console.error(`   - (${h.context}) "${h.text}" at ${h.file}:${h.line}`);
    }
    errors += fallbackHits.length;
  }

  // 4. Direction 3: Scan vi.ts for leaked English UI terminology
  const viLeaks = scanVietnameseLocaleLeaks(VI_FILE);
  if (viLeaks.length > 0) {
    console.error(
      `❌ Found ${viLeaks.length} potential English leak(s) inside vi.ts:`,
    );
    for (const leak of viLeaks) {
      console.error(
        `   - ${leak.key} (${leak.reason}) at vi.ts:${leak.line}: "${leak.text}"`,
      );
    }
    errors += viLeaks.length;
  }

  if (errors > 0) {
    console.error(
      `\n❌ Two-Way i18n Check FAILED with ${errors} total issue(s).\n`,
    );
    process.exit(1);
  }

  console.log(
    "✅ Direction 1: All dictionary keys and t() calls are 100% consistent!",
  );
  console.log(
    "✅ Direction 2: Zero hardcoded JSX text, attributes, or fallbacks found!",
  );
  console.log(
    "✅ Direction 3: Zero English UI leaks detected in Vietnamese dictionary!",
  );
  console.log("🎉 Two-Way i18n Verification PASSED 100%!\n");
  process.exit(0);
}

main();
