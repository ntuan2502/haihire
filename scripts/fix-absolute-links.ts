import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = process.cwd();
const normalizedRootDir = rootDir.replace(/\\/g, "/");

// Flag to check if running in dry-run mode
const isDryRun = process.argv.includes("--dry-run");

function getMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (["node_modules", ".git", "dist", "build", ".next"].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getMarkdownFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

interface ConversionRecord {
  file: string;
  line: number;
  originalLink: string;
  convertedLink: string;
  text: string;
}

const allFiles = getMarkdownFiles(rootDir);
const conversions: ConversionRecord[] = [];
const skippedInCodeBlock: { file: string; line: number; link: string }[] = [];
const edgeCases: { file: string; line: number; link: string; reason: string }[] = [];

let modifiedFileCount = 0;

for (const filePath of allFiles) {
  const relFilePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const fileDir = path.dirname(filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  let inCodeBlock = false;
  let fileModified = false;
  const newLines: string[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    // Check for fenced code block start/end
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      newLines.push(line);
      continue;
    }

    // Match markdown links: [text](target), supporting nested brackets in text like `jobs/[id]/page.tsx`
    const markdownLinkRegex = /\[((?:\[[^\]]*\]|[^\]])+)\]\((file:\/\/\/[^)]+)\)/g;

    let modifiedLine = line;
    let match: RegExpExecArray | null;

    // Check if line contains file:/// at all
    if (line.includes("file:///")) {
      if (inCodeBlock) {
        skippedInCodeBlock.push({
          file: relFilePath,
          line: lineIdx + 1,
          link: line.trim(),
        });
        newLines.push(line);
        continue;
      }

      // Process all markdown links on this line
      modifiedLine = line.replace(markdownLinkRegex, (fullMatch, text, target) => {
        // Parse target URL and potential hash/anchor
        const hashIdx = target.indexOf("#");
        const urlWithoutHash = hashIdx !== -1 ? target.slice(0, hashIdx) : target;
        const hash = hashIdx !== -1 ? target.slice(hashIdx) : "";

        // Extract path after file:///
        let cleanPath = urlWithoutHash.replace(/^file:\/\/\//i, "");

        // Decode URL components if any
        cleanPath = decodeURIComponent(cleanPath);

        // Normalize slashes
        cleanPath = cleanPath.replace(/\\/g, "/");

        // Check if cleanPath points to the workspace
        // Handle variations like c:/Workspaces/haihire/... or C:/Workspaces/haihire/...
        let targetAbsolutePath: string;

        // On Windows drive letter: /?C:/... or C:/...
        cleanPath = cleanPath.replace(/^\/+/, ""); // strip leading slashes if any

        if (/^[a-zA-Z]:\//i.test(cleanPath)) {
          // Check if it belongs to our repository
          const driveAndPath = cleanPath;
          if (driveAndPath.toLowerCase().startsWith(normalizedRootDir.toLowerCase())) {
            const relToRoot = driveAndPath.slice(normalizedRootDir.length).replace(/^\/+/, "");
            targetAbsolutePath = path.resolve(rootDir, relToRoot);
          } else {
            edgeCases.push({
              file: relFilePath,
              line: lineIdx + 1,
              link: target,
              reason: "Absolute path outside of workspace root",
            });
            return fullMatch;
          }
        } else {
          // Relative to root
          targetAbsolutePath = path.resolve(rootDir, cleanPath);
        }

        // Calculate relative path from current file directory to target file
        let relativeTarget = path.relative(fileDir, targetAbsolutePath).replace(/\\/g, "/");

        // If target is in the same directory, path.relative returns just filename.
        // That is valid in markdown, e.g. "dlq-recovery.md" or "./dlq-recovery.md".
        // Keep it clean without leading ./ unless empty (which means same file).
        if (!relativeTarget) {
          relativeTarget = ".";
        }

        const newTarget = relativeTarget + hash;

        conversions.push({
          file: relFilePath,
          line: lineIdx + 1,
          originalLink: target,
          convertedLink: newTarget,
          text,
        });

        fileModified = true;
        return `[${text}](${newTarget})`;
      });
    }

    newLines.push(modifiedLine);
  }

  if (fileModified) {
    modifiedFileCount++;
    if (!isDryRun) {
      fs.writeFileSync(filePath, newLines.join("\n"), "utf-8");
    }
  }
}

console.log("==================================================================");
console.log(`  FIX ABSOLUTE file:/// LINKS TO RELATIVE PATHS ${isDryRun ? "(DRY RUN)" : "(APPLIED)"}`);
console.log("==================================================================");
console.log(`Total markdown files scanned: ${allFiles.length}`);
console.log(`Files with conversions:       ${modifiedFileCount}`);
console.log(`Total links converted:        ${conversions.length}`);
console.log(`Links skipped in code blocks: ${skippedInCodeBlock.length}`);
console.log(`Edge cases / skipped links:   ${edgeCases.length}`);
console.log("------------------------------------------------------------------");

if (skippedInCodeBlock.length > 0) {
  console.log(`\nSample skipped in code blocks (first 5):`);
  skippedInCodeBlock.slice(0, 5).forEach((s) => {
    console.log(`  - ${s.file}:${s.line} -> ${s.link}`);
  });
}

if (edgeCases.length > 0) {
  console.log(`\nEdge cases (first 5):`);
  edgeCases.slice(0, 5).forEach((e) => {
    console.log(`  - ${e.file}:${e.line} [${e.reason}] -> ${e.link}`);
  });
}

console.log("\nSample 10 link conversions (Before -> After):");
conversions.slice(0, 10).forEach((c, idx) => {
  console.log(`[${idx + 1}] In ${c.file}:${c.line}`);
  console.log(`    Original:  [${c.text}](${c.originalLink})`);
  console.log(`    Converted: [${c.text}](${c.convertedLink})`);
});
console.log("==================================================================");
