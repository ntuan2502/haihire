import * as fs from "node:fs";
import * as path from "node:path";

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

export function checkDtoPipeCoverage(baseDir?: string): {
  compliant: boolean;
  totalControllers: number;
  totalPiped: number;
  violations: Violation[];
} {
  const targetDir = baseDir || path.resolve(process.cwd(), "backend/src");

  function findControllers(dir: string): string[] {
    const list: string[] = [];
    if (!fs.existsSync(dir)) return list;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        list.push(...findControllers(fullPath));
      } else if (item.endsWith(".controller.ts")) {
        list.push(fullPath);
      }
    }
    return list;
  }

  const controllers = findControllers(targetDir);
  const violations: Violation[] = [];
  let totalPiped = 0;

  for (const file of controllers) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line contains @Body() parameter
      if (line.includes("@Body()")) {
        // Unpiped @Body() detected
        violations.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
          snippet: line.trim(),
        });
      } else if (line.includes("@Body(DtoPipe")) {
        totalPiped++;
      }
    }
  }

  return {
    compliant: violations.length === 0,
    totalControllers: controllers.length,
    totalPiped,
    violations,
  };
}

// Standalone execution
if (process.argv[1]?.endsWith("check-dtopipe-coverage.ts")) {
  console.log("==================================================================");
  console.log("      CI ARCHITECTURE GATE: DTOPIPE VALIDATION COVERAGE CHECK     ");
  console.log("==================================================================");

  const result = checkDtoPipeCoverage();

  console.log(`Controllers Scanned: ${result.totalControllers}`);
  console.log(`Properly Piped Endpoints (@Body(DtoPipe)): ${result.totalPiped}`);

  if (!result.compliant) {
    console.error(`\n[CI GATE FAILED] Found ${result.violations.length} unpiped @Body() parameters:`);
    for (const v of result.violations) {
      console.error(`  - ${v.file}:${v.line} -> ${v.snippet}`);
    }
    console.error("\nRemediation: Wrap the DTO class with DtoPipe(<DtoClass>) in @Body decorator.");
    process.exit(1);
  } else {
    console.log(`\n[CI GATE PASSED] 100% of @Body() parameters are protected by DtoPipe.`);
    console.log("==================================================================");
    process.exit(0);
  }
}
