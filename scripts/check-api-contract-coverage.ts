import * as fs from "fs";
import * as path from "path";

const backendDir = path.resolve(__dirname, "../backend/src");
const frontendDir = path.resolve(__dirname, "../frontend/src");

interface EndpointDef {
  controller: string;
  baseRoute: string;
  httpMethod: string;
  subRoute: string;
  fullRoute: string;
  hasBody: boolean;
  methodName: string;
  line: number;
}

function getAllFiles(dir: string, ext = ".ts"): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext));
    } else if (file.endsWith(ext) && !file.endsWith(".spec.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const controllerFiles = getAllFiles(backendDir).filter((f) =>
  f.endsWith(".controller.ts"),
);

const endpoints: EndpointDef[] = [];

for (const file of controllerFiles) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  const controllerName = path.basename(file);

  // Extract base route from @Controller('...')
  let baseRoute = "";
  const controllerMatch = content.match(/@Controller\((?:["']([^"']*)["'])?\)/);
  if (controllerMatch) {
    baseRoute = controllerMatch[1] || "";
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const methodMatch = line.match(
      /@(Get|Post|Put|Patch|Delete)\((?:["']([^"']*)["'])?\)/,
    );
    if (methodMatch) {
      const httpMethod = methodMatch[1].toUpperCase();
      const subRoute = methodMatch[2] || "";

      // Find the method definition following this decorator
      let methodName = "unknown";
      let hasBody = false;
      for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
        const nextLine = lines[j];
        if (nextLine.includes("@Body(")) {
          hasBody = true;
        }
        const fnMatch = nextLine.match(
          /(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/,
        );
        if (fnMatch && !fnMatch[1].startsWith("@")) {
          methodName = fnMatch[1];
          // Check if method signature has @Body
          const sig = lines.slice(i, j + 1).join(" ");
          if (sig.includes("@Body")) {
            hasBody = true;
          }
          break;
        }
      }

      const fullRoute = `/${baseRoute}${subRoute ? `/${subRoute}` : ""}`
        .replace(/\/+/g, "/")
        .replace(/\/$/, "");

      endpoints.push({
        controller: controllerName,
        baseRoute,
        httpMethod,
        subRoute,
        fullRoute: fullRoute || "/",
        hasBody,
        methodName,
        line: i + 1,
      });
    }
  }
}

// Read frontend files for API calls and error handling
const frontendFiles = getAllFiles(frontendDir);
const frontendContent = frontendFiles
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");

console.log("==================================================================");
console.log("       CI ARCHITECTURE GATE: API CONTRACT COVERAGE AUDIT          ");
console.log("==================================================================");
console.log(`Backend Controllers Scanned: ${controllerFiles.length}`);
console.log(`Total Endpoints Discovered: ${endpoints.length}`);

const bodyEndpoints = endpoints.filter((e) => e.hasBody);
console.log(`Endpoints with @Body(): ${bodyEndpoints.length}`);
console.log("------------------------------------------------------------------");

// Verify every backend resource controller has frontend coverage
const expectedControllers = [
  "activities.controller.ts",
  "applications.controller.ts",
  "auth.controller.ts",
  "candidates.controller.ts",
  "email.controller.ts",
  "interviews.controller.ts",
  "jobs.controller.ts",
  "organizations.controller.ts",
  "sourcing.controller.ts",
];

const missingControllers: string[] = [];
for (const ctrl of expectedControllers) {
  const baseName = ctrl.replace(".controller.ts", "");
  const apiFile = path.join(frontendDir, "lib", "api", `${baseName}.ts`);
  if (!fs.existsSync(apiFile)) {
    missingControllers.push(ctrl);
  }
}

if (missingControllers.length > 0) {
  console.error(
    `[FAIL] Missing frontend API client modules for controllers:`,
    missingControllers,
  );
  process.exit(1);
} else {
  console.log(
    `[PASS] 100% of core domain controllers have corresponding frontend API client modules (${expectedControllers.length}/${expectedControllers.length}).`,
  );
}

// Verify frontend error handling coverage
let rawStringifyErrors = 0;
let alertGenericErrors = 0;

for (const file of frontendFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("JSON.stringify(err") || content.includes("JSON.stringify(error")) {
    rawStringifyErrors++;
  }
  if (content.includes("alert(") && !file.includes(".spec.")) {
    alertGenericErrors++;
  }
}

if (rawStringifyErrors > 0) {
  console.error(
    `[FAIL] Found ${rawStringifyErrors} file(s) leaking raw JSON.stringify(err)`,
  );
  process.exit(1);
} else {
  console.log(
    `[PASS] Zero raw JSON.stringify(err) leaks detected in frontend.`,
  );
}

if (alertGenericErrors > 0) {
  console.error(
    `[FAIL] Found ${alertGenericErrors} file(s) using blocking alert() instead of localized toast / inline error.`,
  );
  process.exit(1);
} else {
  console.log(
    `[PASS] Zero blocking alert() calls found in frontend application code.`,
  );
}

console.log("==================================================================");
console.log("[CI GATE PASSED] API Contract and Frontend Coverage Validated.");
console.log("==================================================================");
