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

interface BrokenLink {
  sourceFile: string;
  linkText: string;
  rawTarget: string;
  resolvedTarget: string;
}

const brokenLinks: BrokenLink[] = [];
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, "utf-8");
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    const text = match[1];
    const target = match[2].trim();

    // Skip web URLs, anchors, mailto
    if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#") || target.startsWith("mailto:")) {
      continue;
    }

    let resolvedPath = "";
    const cleanTarget = target.split("#")[0];
    if (cleanTarget.startsWith("file:///")) {
      resolvedPath = path.normalize(decodeURIComponent(cleanTarget.replace("file:///", "")));
      // On Windows, if starts with c: or similar, handle drive letter
      if (/^[a-zA-Z]:/.test(resolvedPath)) {
        // already absolute
      } else {
        resolvedPath = path.resolve(rootDir, resolvedPath);
      }
    } else {
      // relative path
      resolvedPath = path.resolve(path.dirname(filePath), cleanTarget);
    }

    if (!fs.existsSync(resolvedPath)) {
      brokenLinks.push({
        sourceFile: path.relative(rootDir, filePath),
        linkText: text,
        rawTarget: target,
        resolvedTarget: path.relative(rootDir, resolvedPath),
      });
    }
  }
}

console.log(`Audited ${filesToScan.length} markdown files.`);
if (brokenLinks.length === 0) {
  console.log("SUCCESS: 0 broken markdown links found.");
} else {
  console.error(`FAILURE: Found ${brokenLinks.length} broken markdown links:`);
  for (const b of brokenLinks) {
    console.error(`- In ${b.sourceFile}: [${b.linkText}](${b.rawTarget}) -> Target not found: ${b.resolvedTarget}`);
  }
  process.exit(1);
}
