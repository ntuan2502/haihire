import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = process.cwd();

interface PackageJson {
  name: string;
  version?: string;
  [key: string]: unknown;
}

const packagePaths = [
  { label: "Root", path: path.join(rootDir, "package.json") },
  { label: "Backend", path: path.join(rootDir, "backend", "package.json") },
  { label: "Frontend", path: path.join(rootDir, "frontend", "package.json") },
  { label: "Shared", path: path.join(rootDir, "packages", "shared", "package.json") },
];

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function syncVersions(targetVersion?: string, dryRun = false): {
  targetVersion: string;
  updated: Array<{ label: string; file: string; oldVersion?: string; newVersion: string }>;
} {
  const rootPkg = readJson<PackageJson>(packagePaths[0].path);
  const versionToApply = targetVersion || rootPkg.version || "1.0.0";

  console.log("==================================================================");
  console.log("             HAIHIRE MONOREPO VERSION SYNCHRONIZER               ");
  console.log("==================================================================");
  console.log(`Target Version: ${versionToApply} ${dryRun ? "(DRY RUN - No changes written)" : ""}`);
  console.log("------------------------------------------------------------------");

  const updated: Array<{ label: string; file: string; oldVersion?: string; newVersion: string }> = [];

  for (const item of packagePaths) {
    if (!fs.existsSync(item.path)) {
      console.warn(`[WARN] File not found: ${item.path}`);
      continue;
    }

    const pkg = readJson<PackageJson>(item.path);
    const oldVersion = pkg.version;
    const relPath = path.relative(rootDir, item.path).replace(/\\/g, "/");

    if (oldVersion !== versionToApply) {
      console.log(`[SYNC] ${item.label} (${relPath}): ${oldVersion || "<missing>"} -> ${versionToApply}`);
      pkg.version = versionToApply;
      if (!dryRun) {
        writeJson(item.path, pkg);
      }
      updated.push({
        label: item.label,
        file: relPath,
        oldVersion,
        newVersion: versionToApply,
      });
    } else {
      console.log(`[OK]   ${item.label} (${relPath}): ${oldVersion} (Already aligned)`);
    }
  }

  console.log("==================================================================");
  if (updated.length > 0) {
    console.log(`Result: ${dryRun ? "Would update" : "Successfully aligned"} ${updated.length} package(s) to version ${versionToApply}.`);
  } else {
    console.log(`Result: All packages are already in 100% version alignment (${versionToApply}).`);
  }

  return { targetVersion: versionToApply, updated };
}

// Direct CLI execution
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("sync-version.ts")) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const versionArg = args.find((a) => !a.startsWith("--"));

  syncVersions(versionArg, isDryRun);
}
