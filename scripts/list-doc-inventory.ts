import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = process.cwd();

interface DocItem {
  file: string;
  category: string;
  sizeKb: string;
  lastUpdate: string;
  stale: string;
}

function scanDir(dir: string, results: DocItem[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === "dist" ||
      entry.name === ".git" ||
      entry.name === ".system_generated" ||
      entry.name === "skills" ||
      entry.name === "workflows" ||
      entry.name === "rules"
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const rel = path.relative(rootDir, fullPath).replace(/\\/g, "/");
      let category = "Other";
      if (/^(README|CHANGELOG|CONTRIBUTING)\.md$/.test(rel)) {
        category = "Root-level";
      } else if (rel.startsWith("docs/runbooks/")) {
        category = "Runbooks";
      } else if (rel.startsWith("docs/architecture/")) {
        category = "Architecture";
      } else if (rel.startsWith("docs/api/")) {
        category = "API";
      } else if (rel.startsWith("docs/audits/archive/")) {
        category = "Audits (Archived)";
      } else if (rel.startsWith("docs/audits/")) {
        category = "Audits (Active)";
      } else if (rel.startsWith(".agents/memory/")) {
        category = "Memory";
      } else if (/(backend|frontend|packages)\/.*README\.md$/.test(rel)) {
        category = "Package-level";
      } else if (rel.startsWith("docs/")) {
        category = "Docs Core";
      }

      const stat = fs.statSync(fullPath);
      const sizeKb = (stat.size / 1024).toFixed(1) + " KB";
      const lastUpdate = stat.mtime.toISOString().substring(0, 10);
      results.push({
        file: rel,
        category,
        sizeKb,
        lastUpdate,
        stale: "No (Synchronized)",
      });
    }
  }
  return results;
}

const list = scanDir(rootDir);
list.sort((a, b) => a.category.localeCompare(b.category) || a.file.localeCompare(b.file));

console.log("| File | Category | Size | Last Update | Stale? |");
console.log("| :--- | :--- | :---: | :---: | :---: |");
for (const item of list) {
  console.log(`| \`${item.file}\` | ${item.category} | ${item.sizeKb} | ${item.lastUpdate} | ${item.stale} |`);
}
console.log(`\nTotal docs: ${list.length}`);
