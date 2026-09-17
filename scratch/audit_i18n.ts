import * as fs from "fs";
import * as path from "path";

const viPath = path.join(__dirname, "../frontend/src/i18n/locales/vi.ts");
const content = fs.readFileSync(viPath, "utf-8");

// Regex match lines with {param}
const lines = content.split("\n");
const results: { lineNum: number; line: string }[] = [];

lines.forEach((line, idx) => {
  if (/\{[a-zA-Z0-9_]+\}/.test(line)) {
    results.push({ lineNum: idx + 1, line: line.trim() });
  }
});

console.log(`Found ${results.length} parameterized lines in vi.ts:`);
results.forEach((r) => {
  console.log(`${r.lineNum}: ${r.line}`);
});
