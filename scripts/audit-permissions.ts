import * as fs from "fs";
import * as path from "path";

export interface EndpointAudit {
  controller: string;
  controllerFile: string;
  methodName: string;
  httpMethod: string;
  fullRoute: string;
  hasJwtGuard: boolean;
  hasRolesGuard: boolean;
  permission: string | null;
  permissionSource: "method" | "class" | "none";
  isPublic: boolean;
  line: number;
}

const backendDir = path.resolve(__dirname, "../backend/src");

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

export function runPermissionAudit(): {
  controllersScanned: number;
  endpoints: EndpointAudit[];
  permissionProtectedCount: number;
  classInheritedCount: number;
  methodExplicitCount: number;
  authenticatedOnlyCount: number;
  publicCount: number;
  violations: string[];
} {
  const controllerFiles = getAllFiles(backendDir).filter((f) =>
    f.endsWith(".controller.ts"),
  );

  const endpoints: EndpointAudit[] = [];
  const violations: string[] = [];

  for (const file of controllerFiles) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    const controllerName = path.basename(file);

    // 1. Inspect Class Level Header
    const classIndex = lines.findIndex((l) => /export\s+class\s+/.test(l));
    const classHeader =
      classIndex !== -1 ? lines.slice(0, classIndex).join("\n") : "";

    let baseRoute = "";
    const baseRouteMatch = classHeader.match(
      /@Controller\((?:["']([^"']*)["'])?\)/,
    );
    if (baseRouteMatch) {
      baseRoute = baseRouteMatch[1] || "";
    }

    const classHasJwt =
      classHeader.includes("JwtAuthGuard") ||
      classHeader.includes('AuthGuard("jwt")') ||
      classHeader.includes("AuthGuard('jwt')");
    const classHasRoles = classHeader.includes("RolesGuard");

    let classPermission: string | null = null;
    const classPermMatch = classHeader.match(
      /@RequirePermission\((?:["']([^"']*)["'])\)/,
    );
    if (classPermMatch) {
      classPermission = classPermMatch[1];
    }

    // 2. Inspect Method Handlers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const methodMatch = line.match(
        /@(Get|Post|Put|Patch|Delete)\((?:["']([^"']*)["'])?\)/,
      );
      if (methodMatch) {
        const httpMethod = methodMatch[1].toUpperCase();
        const subRoute = methodMatch[2] || "";

        // Check decorators surrounding this endpoint (lookback 5 lines, lookahead 5 lines)
        const windowStart = Math.max(0, i - 6);
        const windowEnd = Math.min(lines.length, i + 8);
        const windowText = lines.slice(windowStart, windowEnd).join("\n");

        // Find method name
        let methodName = "unknown";
        for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
          const nextLine = lines[j];
          const fnMatch = nextLine.match(/(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/);
          if (fnMatch && !fnMatch[1].startsWith("@") && fnMatch[1] !== "if") {
            methodName = fnMatch[1];
            break;
          }
        }

        // Method level guards
        // Check decorators specifically attached before the method name
        let methodHasJwt = false;
        let methodHasRoles = false;
        let methodPermission: string | null = null;

        // Collect preceding lines until another method or closing brace
        for (let k = i - 1; k >= Math.max(0, i - 8); k--) {
          const prevLine = lines[k].trim();
          if (prevLine.startsWith("@UseGuards(")) {
            if (
              prevLine.includes("JwtAuthGuard") ||
              prevLine.includes('AuthGuard("jwt")') ||
              prevLine.includes("AuthGuard('jwt')")
            ) {
              methodHasJwt = true;
            }
            if (prevLine.includes("RolesGuard")) {
              methodHasRoles = true;
            }
          }
          if (prevLine.startsWith("@RequirePermission(")) {
            const m = prevLine.match(
              /@RequirePermission\((?:["']([^"']*)["'])\)/,
            );
            if (m) methodPermission = m[1];
          }
          if (
            prevLine.endsWith("}") ||
            prevLine.includes("class ") ||
            prevLine.includes("@Get") ||
            prevLine.includes("@Post") ||
            prevLine.includes("@Put") ||
            prevLine.includes("@Patch") ||
            prevLine.includes("@Delete")
          ) {
            break;
          }
        }

        // Also check if @RequirePermission is placed right after @Get/@Post
        for (let k = i + 1; k < Math.min(lines.length, i + 6); k++) {
          const nextLine = lines[k].trim();
          if (nextLine.startsWith("@RequirePermission(")) {
            const m = nextLine.match(
              /@RequirePermission\((?:["']([^"']*)["'])\)/,
            );
            if (m) methodPermission = m[1];
          }
          if (nextLine.startsWith("@UseGuards(")) {
            if (
              nextLine.includes("JwtAuthGuard") ||
              nextLine.includes('AuthGuard("jwt")') ||
              nextLine.includes("AuthGuard('jwt')")
            ) {
              methodHasJwt = true;
            }
            if (nextLine.includes("RolesGuard")) {
              methodHasRoles = true;
            }
          }
          if (nextLine.includes("(") && !nextLine.startsWith("@")) {
            break;
          }
        }

        const effectiveJwt = classHasJwt || methodHasJwt;
        const effectiveRoles = classHasRoles || methodHasRoles;
        const effectivePermission = methodPermission || classPermission;
        const permissionSource: "method" | "class" | "none" = methodPermission
          ? "method"
          : classPermission
            ? "class"
            : "none";

        const fullRoute = `/${baseRoute}${subRoute ? `/${subRoute}` : ""}`
          .replace(/\/+/g, "/")
          .replace(/\/$/, "");

        const endpoint: EndpointAudit = {
          controller: controllerName,
          controllerFile: path
            .relative(path.resolve(__dirname, ".."), file)
            .replace(/\\/g, "/"),
          methodName,
          httpMethod,
          fullRoute: fullRoute || "/",
          hasJwtGuard: effectiveJwt,
          hasRolesGuard: effectiveRoles,
          permission: effectivePermission,
          permissionSource,
          isPublic: !effectiveJwt,
          line: i + 1,
        };

        endpoints.push(endpoint);

        // Validation: If permission is required, RolesGuard and JwtAuthGuard MUST be active
        if (effectivePermission && !effectiveRoles) {
          violations.push(
            `[MISSING ROLES_GUARD] ${endpoint.httpMethod} ${endpoint.fullRoute} (${endpoint.controller}#${endpoint.methodName}:${endpoint.line}) requires '${effectivePermission}' but has no RolesGuard!`,
          );
        }
        if (effectivePermission && !effectiveJwt) {
          violations.push(
            `[MISSING JWT_GUARD] ${endpoint.httpMethod} ${endpoint.fullRoute} (${endpoint.controller}#${endpoint.methodName}:${endpoint.line}) requires '${effectivePermission}' but has no JwtAuthGuard!`,
          );
        }
      }
    }
  }

  const permissionProtectedCount = endpoints.filter(
    (e) => e.permission !== null,
  ).length;
  const classInheritedCount = endpoints.filter(
    (e) => e.permissionSource === "class",
  ).length;
  const methodExplicitCount = endpoints.filter(
    (e) => e.permissionSource === "method",
  ).length;
  const authenticatedOnlyCount = endpoints.filter(
    (e) => e.hasJwtGuard && e.permission === null,
  ).length;
  const publicCount = endpoints.filter((e) => !e.hasJwtGuard).length;

  return {
    controllersScanned: controllerFiles.length,
    endpoints,
    permissionProtectedCount,
    classInheritedCount,
    methodExplicitCount,
    authenticatedOnlyCount,
    publicCount,
    violations,
  };
}

if (process.argv[1]?.endsWith("audit-permissions.ts")) {
  const result = runPermissionAudit();

  console.log(
    "==================================================================",
  );
  console.log(
    "       CI ARCHITECTURE AUDIT: PERMISSIONS & ROLES GUARD SCAN       ",
  );
  console.log(
    "==================================================================",
  );
  console.log(`Controllers Scanned:          ${result.controllersScanned}`);
  console.log(`Total Endpoints Audited:      ${result.endpoints.length}`);
  console.log(
    `------------------------------------------------------------------`,
  );
  console.log(
    `Permission Protected:         ${result.permissionProtectedCount}`,
  );
  console.log(`  • Method-level explicit:    ${result.methodExplicitCount}`);
  console.log(`  • Class-level inherited:    ${result.classInheritedCount}`);
  console.log(`Authenticated Only (no perm): ${result.authenticatedOnlyCount}`);
  console.log(`Public (no auth required):    ${result.publicCount}`);
  console.log(
    `==================================================================`,
  );

  console.log("\n📋 Class-Level Inherited Endpoints Breakdown:");
  for (const ep of result.endpoints.filter(
    (e) => e.permissionSource === "class",
  )) {
    console.log(
      `  • ${ep.controller}#${ep.methodName.padEnd(20)} [${ep.httpMethod.padEnd(6)}] ${ep.fullRoute.padEnd(30)} -> '${ep.permission}' (Class Inherited)`,
    );
  }

  if (result.violations.length > 0) {
    console.error("\n❌ VIOLATIONS FOUND:");
    for (const v of result.violations) {
      console.error(`  - ${v}`);
    }
    process.exit(1);
  }

  console.log(
    "\n✅ [AUDIT PASSED] 100% of permission-guarded routes have valid JwtAuthGuard & RolesGuard backing.",
  );
}
