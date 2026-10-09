import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = process.cwd();

function getMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "dist" && entry.name !== ".git") {
        getMarkdownFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const targetDirs = [
  path.join(rootDir, "docs"),
  path.join(rootDir, ".agents", "memory"),
];
const individualFiles = [
  path.join(rootDir, "README.md"),
  path.join(rootDir, "CHANGELOG.md"),
  path.join(rootDir, "CONTRIBUTING.md"),
  path.join(rootDir, "backend", "README.md"),
  path.join(rootDir, "frontend", "README.md"),
  path.join(rootDir, "packages", "shared", "README.md"),
];

const filesToScan: string[] = [];
for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    getMarkdownFiles(dir, filesToScan);
  }
}
for (const f of individualFiles) {
  if (fs.existsSync(f)) {
    filesToScan.push(f);
  }
}

interface LinkViolation {
  sourceFile: string;
  lineNumber: number;
  linkText: string;
  rawTarget: string;
  reason: string;
}

const violations: LinkViolation[] = [];
// Regex supporting nested brackets in link text, e.g. [`jobs/[id]/page.tsx`](...)
const linkRegex = /\[((?:\[[^\]]*\]|[^\]])+)\]\(([^)]+)\)/g;

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  let inCodeBlock = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip example links inside fenced code blocks
    if (inCodeBlock) {
      continue;
    }

    let match: RegExpExecArray | null;
    linkRegex.lastIndex = 0;

    while ((match = linkRegex.exec(line)) !== null) {
      const text = match[1];
      const target = match[2].trim();
      const lineNumber = lineIdx + 1;

      // Skip web URLs, anchors, mailto
      if (
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("#") ||
        target.startsWith("mailto:")
      ) {
        continue;
      }

      // Rule 1: Reject absolute file:/// links (Non-portable, breaks in CI/Linux/GitHub)
      if (target.startsWith("file:///") || target.startsWith("file://")) {
        violations.push({
          sourceFile: path.relative(rootDir, filePath).replace(/\\/g, "/"),
          lineNumber,
          linkText: text,
          rawTarget: target,
          reason: "Absolute file:// link detected — must use portable relative path",
        });
        continue;
      }

      // Rule 2: Reject Windows backslash in markdown links
      if (target.includes("\\")) {
        violations.push({
          sourceFile: path.relative(rootDir, filePath).replace(/\\/g, "/"),
          lineNumber,
          linkText: text,
          rawTarget: target,
          reason: "Windows backslash '\\' detected — markdown links must use forward slash '/'",
        });
        continue;
      }

      // Rule 3: Verify target exists on disk
      const cleanTarget = target.split("#")[0];
      const resolvedPath = path.resolve(path.dirname(filePath), cleanTarget);

      if (!fs.existsSync(resolvedPath)) {
        violations.push({
          sourceFile: path.relative(rootDir, filePath).replace(/\\/g, "/"),
          lineNumber,
          linkText: text,
          rawTarget: target,
          reason: `Target file not found: ${path.relative(rootDir, resolvedPath).replace(/\\/g, "/")}`,
        });
      }
    }
  }
}

console.log(`Audited ${filesToScan.length} markdown files for link integrity, portability, and validity.`);
if (violations.length === 0) {
  console.log("SUCCESS: 0 broken or non-portable markdown links found. All links are relative and valid!");
} else {
  console.error(`FAILURE: Found ${violations.length} markdown link violations:`);
  for (const v of violations) {
    console.error(`- In ${v.sourceFile}:${v.lineNumber}: [${v.linkText}](${v.rawTarget}) -> ${v.reason}`);
  }
  process.exit(1);
}
