#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseEnvKeys } from "./check-env-sync.ts";

export const statsDocument = "docs/PROJECT_METRICS.md";
export const statsBlockPattern =
  /<!-- STATS:START -->[\s\S]*?<!-- STATS:END -->/;

export interface RepoStats {
  models: number;
  enums: number;
  modules: number;
  controllers: number;
  restRoutes: number;
  sseRoutes: number;
  e2eFiles: number;
  e2eTests: number;
  ciGatesCount: number;
  envKeysCount: number;
  preReleasePackages: string[];
}

export function detectPreReleasePackages(): string[] {
  const root = process.cwd();
  const manifestPaths = [
    join(root, "package.json"),
    join(root, "apps", "api", "package.json"),
    join(root, "apps", "web", "package.json"),
    join(root, "packages", "shared", "package.json"),
  ];

  const packages = new Set<string>();

  for (const p of manifestPaths) {
    if (!existsSync(p)) continue;
    try {
      const pkg = JSON.parse(readFileSync(p, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        if (
          typeof version === "string" &&
          /-(rc|beta|alpha)\b/i.test(version)
        ) {
          packages.add(`${name}@${version}`);
        }
      }
    } catch {
      // ignore parse error
    }
  }

  const workspaceFile = join(root, "pnpm-workspace.yaml");
  if (existsSync(workspaceFile)) {
    const content = readFileSync(workspaceFile, "utf-8");
    const regex =
      /^\s*["']?([@a-zA-Z0-9/_-]+)["']?:\s*["']([^"']*-(?:rc|beta|alpha)[^"']*)["']/gm;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (match[1] && match[2]) {
        packages.add(`${match[1]}@${match[2]}`);
      }
    }
  }

  return Array.from(packages).sort();
}

export function collectRepoStats(): RepoStats {
  const api = "apps/api/src";
  const schema = readFileSync(join(api, "prisma/schema.prisma"), "utf-8");
  const appModule = readFileSync(join(api, "app.module.ts"), "utf-8");
  const imports = appModule.match(/^  imports: \[([\s\S]*?)^  \],/m)?.[1];
  if (!imports) throw new Error("Cannot locate AppModule imports");

  const controllers = readdirSync(api, { recursive: true, encoding: "utf-8" })
    .filter((path) => path.endsWith(".controller.ts"))
    .map((path) => readFileSync(join(api, path), "utf-8"))
    .filter((source) => /^@Controller\(/m.test(source));

  const e2eDir = "apps/web/tests/e2e";
  const e2eFiles = readdirSync(e2eDir).filter((name) =>
    name.endsWith(".spec.ts"),
  );
  const e2eTests = e2eFiles.reduce((total, name) => {
    const source = readFileSync(join(e2eDir, name), "utf-8");
    return total + [...source.matchAll(/^\s*(?:it|test)\s*\(/gm)].length;
  }, 0);

  const envKeys = parseEnvKeys(resolve(".env.example"));
  if (!envKeys) throw new Error("Cannot read .env.example");

  return {
    models: [...schema.matchAll(/^model\s+/gm)].length,
    enums: [...schema.matchAll(/^enum\s+/gm)].length,
    modules: [...imports.matchAll(/^    \w+Module,\s*$/gm)].length,
    controllers: controllers.length,
    restRoutes: controllers.reduce(
      (total, source) =>
        total +
        [
          ...source.matchAll(
            /^\s+@(?:Get|Post|Put|Patch|Delete|Head|Options|All)\(/gm,
          ),
        ].length,
      0,
    ),
    sseRoutes: controllers.reduce(
      (total, source) => total + [...source.matchAll(/^\s+@Sse\(/gm)].length,
      0,
    ),
    e2eFiles: e2eFiles.length,
    e2eTests,
    ciGatesCount: [
      ...readFileSync("scripts/check-all.ts", "utf-8").matchAll(
        /^\s+name: "CI Gate \d+:/gm,
      ),
    ].length,
    envKeysCount: envKeys.size,
    preReleasePackages: detectPreReleasePackages(),
  };
}

export function generateStatsMarkdown(stats: RepoStats): string {
  return `<!-- STATS:START -->
| Metric | Count |
| --- | ---: |
| Prisma models | ${stats.models} |
| Prisma enums | ${stats.enums} |
| Project modules registered directly in AppModule | ${stats.modules} |
| Backend controllers | ${stats.controllers} |
| API endpoints | ${stats.restRoutes + stats.sseRoutes} (${stats.restRoutes} REST + ${stats.sseRoutes} SSE) |
| Playwright spec files | ${stats.e2eFiles} |
| Playwright test declarations | ${stats.e2eTests} |
| CI gates defined in check-all | ${stats.ciGatesCount} |
| Keys in the local environment template | ${stats.envKeysCount} |
| Pre-release dependency declarations | ${stats.preReleasePackages.length} |
<!-- STATS:END -->`;
}

export function runStatsCli(): void {
  const stats = collectRepoStats();
  const block = generateStatsMarkdown(stats);

  if (process.argv.includes("--write")) {
    const content = readFileSync(statsDocument, "utf-8");
    if (!statsBlockPattern.test(content)) {
      throw new Error(`Missing stats block in ${statsDocument}`);
    }
    writeFileSync(
      statsDocument,
      content.replace(statsBlockPattern, block),
      "utf-8",
    );
    console.log(`Updated metrics in ${statsDocument}`);
  } else {
    console.log(JSON.stringify(stats, null, 2));
    console.log(block);
  }
}

if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("generate-docs-stats.ts")
) {
  runStatsCli();
}
