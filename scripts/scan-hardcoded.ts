import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function walk(dir: string): string[] {
  let files: string[] = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item === "node_modules" || item === ".next" || item === "ui") continue;
      files = files.concat(walk(full));
    } else if (item.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

const FRONTEND_SRC = path.resolve(__dirname, "../frontend/src");
const files = walk(FRONTEND_SRC);
const results: Array<{ file: string; line: number; text: string }> = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf).trim();
      // Ignore empty or single characters or symbols
      if (text && /[a-zA-Z]{2,}/.test(text)) {
        // Exclude purely alphanumeric tokens like SVG paths or technical ids if any
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        results.push({ file: path.relative("frontend", file), line: line + 1, text });
      }
    }

    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const attrName = node.name.getText(sf);
      const val = node.initializer.text.trim();
      // Check for user-facing attributes like placeholder, title, label, alt, aria-label
      if (["placeholder", "title", "label", "alt", "aria-label"].includes(attrName)) {
        if (val && !val.startsWith("{") && /[a-zA-Z]{2,}/.test(val)) {
          const { line } = sf.getLineAndCharacterOfPosition(node.initializer.getStart(sf));
          results.push({ file: path.relative("frontend", file), line: line + 1, text: `[attr ${attrName}] "${val}"` });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
}

console.log(`=== FOUND ${results.length} HARDCODED JSX TEXT/ATTRIBUTES ===`);
for (const r of results) {
  console.log(`${r.file}:${r.line} -> ${r.text}`);
}
