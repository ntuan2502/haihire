import * as fs from "node:fs";
import * as path from "node:path";

export interface NextJsConventionCheckOptions {
  rootDir?: string;
  fileReader?: (filePath: string) => string;
  fileExists?: (filePath: string) => boolean;
}

export interface NextJsConventionResult {
  passed: boolean;
  errors: string[];
}

export function checkNextJsConventions(
  options: NextJsConventionCheckOptions = {},
): NextJsConventionResult {
  const rootDir = options.rootDir || process.cwd();
  const fileExists = options.fileExists || ((p: string) => fs.existsSync(p));
  const fileReader =
    options.fileReader || ((p: string) => fs.readFileSync(p, "utf-8"));

  const errors: string[] = [];

  // Check 1: middleware.ts must NOT exist in frontend or frontend/src
  const forbiddenMiddlewarePaths = [
    path.join(rootDir, "frontend/src/middleware.ts"),
    path.join(rootDir, "frontend/middleware.ts"),
  ];

  for (const forbiddenPath of forbiddenMiddlewarePaths) {
    if (fileExists(forbiddenPath)) {
      errors.push(
        "Next.js 16 renamed middleware.ts to proxy.ts. Rename it back.",
      );
      break;
    }
  }

  // Check 2: proxy.ts MUST exist and export function proxy
  const proxyPath = path.join(rootDir, "frontend/src/proxy.ts");
  if (!fileExists(proxyPath)) {
    errors.push(
      "Required Next.js 16 edge proxy file is missing: frontend/src/proxy.ts",
    );
  } else {
    try {
      const content = fileReader(proxyPath);
      const hasProxyExport =
        /\bexport\s+(async\s+)?function\s+proxy\b/.test(content) ||
        /\bexport\s+const\s+proxy\s*=/.test(content) ||
        /\bexport\s*\{\s*[^}]*\bproxy\b[^}]*\}/.test(content);

      if (!hasProxyExport) {
        errors.push(
          "frontend/src/proxy.ts must export a function named 'proxy' (e.g., export function proxy(request: NextRequest)).",
        );
      }
    } catch (err) {
      errors.push(
        `Failed to read frontend/src/proxy.ts: ${(err as Error).message}`,
      );
    }
  }

  // Check 3: proxy.spec.ts MUST exist (test coverage)
  const proxySpecPath = path.join(rootDir, "frontend/src/proxy.spec.ts");
  if (!fileExists(proxySpecPath)) {
    errors.push(
      "Required unit test file is missing: frontend/src/proxy.spec.ts",
    );
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

// Direct CLI execution
if (
  process.argv[1] &&
  process.argv[1].endsWith("check-nextjs-conventions.ts")
) {
  console.log(
    "==================================================================",
  );
  console.log("   CI ARCHITECTURE GATE: NEXT.JS 16 CONVENTIONS AUDIT");
  console.log(
    "==================================================================",
  );

  const result = checkNextJsConventions();

  if (!result.passed) {
    console.error(
      "❌ CI Gate 'lint:nextjs-conventions' FAILED with violations:",
    );
    for (const err of result.errors) {
      console.error(`   • ${err}`);
    }
    process.exit(1);
  }

  console.log(
    "✅ CI Gate 'lint:nextjs-conventions' PASSED! All Next.js 16 conventions enforced.",
  );
  console.log("   • Zero deprecated middleware.ts files found");
  console.log("   • frontend/src/proxy.ts verified with export function proxy");
  console.log("   • frontend/src/proxy.spec.ts test coverage verified");
  console.log(
    "==================================================================",
  );
}
