import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { checkNextJsConventions } from "./check-nextjs-conventions";

describe("CI Gate: lint:nextjs-conventions (scripts/check-nextjs-conventions.ts)", () => {
  const rootDir = "/mock/project";
  const proxyPath = path.join(rootDir, "frontend/src/proxy.ts");
  const proxySpecPath = path.join(rootDir, "frontend/src/proxy.spec.ts");
  const middlewarePath = path.join(rootDir, "frontend/src/middleware.ts");

  it("Test 1: passes when proxy.ts and proxy.spec.ts exist with valid proxy export and no middleware.ts", () => {
    const existingFiles = new Set([proxyPath, proxySpecPath]);
    const fileContents: Record<string, string> = {
      [proxyPath]:
        "export function proxy(request: NextRequest) { return NextResponse.next(); }",
    };

    const result = checkNextJsConventions({
      rootDir,
      fileExists: (p: string) => existingFiles.has(p),
      fileReader: (p: string) => fileContents[p] || "",
    });

    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("Test 2: fails with specific message when middleware.ts exists", () => {
    const existingFiles = new Set([middlewarePath, proxyPath, proxySpecPath]);
    const fileContents: Record<string, string> = {
      [proxyPath]: "export function proxy() {}",
      [middlewarePath]: "export function middleware() {}",
    };

    const result = checkNextJsConventions({
      rootDir,
      fileExists: (p: string) => existingFiles.has(p),
      fileReader: (p: string) => fileContents[p] || "",
    });

    expect(result.passed).toBe(false);
    expect(result.errors).toContain(
      "Next.js 16 renamed middleware.ts to proxy.ts. Rename it back.",
    );
  });

  it("Test 3: fails when both middleware.ts and proxy.ts exist", () => {
    const existingFiles = new Set([middlewarePath, proxyPath, proxySpecPath]);
    const fileContents: Record<string, string> = {
      [proxyPath]: "export function proxy() {}",
      [middlewarePath]: "export function middleware() {}",
    };

    const result = checkNextJsConventions({
      rootDir,
      fileExists: (p: string) => existingFiles.has(p),
      fileReader: (p: string) => fileContents[p] || "",
    });

    expect(result.passed).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("Next.js 16 renamed middleware.ts to proxy.ts"),
      ),
    ).toBe(true);
  });

  it("Test 4: fails when proxy.ts is missing", () => {
    const existingFiles = new Set([proxySpecPath]);

    const result = checkNextJsConventions({
      rootDir,
      fileExists: (p: string) => existingFiles.has(p),
      fileReader: () => "",
    });

    expect(result.passed).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("Required Next.js 16 edge proxy file is missing"),
      ),
    ).toBe(true);
  });
});
