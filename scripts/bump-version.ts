import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { syncVersions } from "./sync-version.js";

const rootDir = process.cwd();
const rootPkgPath = path.join(rootDir, "package.json");

function parseSemver(v: string): [number, number, number] {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid SemVer format: '${v}'. Expected format like 1.0.0`);
  }
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function bumpSemver(current: string, type: "major" | "minor" | "patch"): string {
  const [major, minor, patch] = parseSemver(current);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

function checkTagExists(tag: string): boolean {
  try {
    const existing = execSync(`git tag -l "${tag}"`, { encoding: "utf-8" }).trim();
    return existing.length > 0;
  } catch {
    return false;
  }
}

export function bumpVersion(
  bumpTypeOrVersion = "patch",
  options: { dryRun?: boolean; tag?: boolean } = {}
): string {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
  const currentVersion = rootPkg.version || "1.0.0";
  let newVersion: string;

  if (["major", "minor", "patch"].includes(bumpTypeOrVersion)) {
    newVersion = bumpSemver(currentVersion, bumpTypeOrVersion as "major" | "minor" | "patch");
  } else if (/^\d+\.\d+\.\d+/.test(bumpTypeOrVersion)) {
    newVersion = bumpTypeOrVersion;
  } else {
    throw new Error(
      `Invalid bump argument: '${bumpTypeOrVersion}'. Expected 'major', 'minor', 'patch', or explicit version 'x.y.z'.`
    );
  }

  const tagName = `v${newVersion}`;
  if (!/^v\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(tagName)) {
    throw new Error(`[INVALID TAG FORMAT] Tag '${tagName}' does not conform to 'v{semver}' specification.`);
  }

  const tagAlreadyExists = checkTagExists(tagName);
  if (options.tag && tagAlreadyExists) {
    throw new Error(
      `[IMMUTABILITY VIOLATION] Git tag '${tagName}' already exists locally! ` +
      `Release tags are strictly immutable. Never force-push or overwrite an existing release tag. ` +
      `Please bump to a subsequent patch or minor version instead.`
    );
  }

  console.log("==================================================================");
  console.log("             HAIHIRE MONOREPO VERSION BUMP TOOL                  ");
  console.log("==================================================================");
  console.log(`Current Version: ${currentVersion}`);
  console.log(`Target Version:  ${newVersion} ${options.dryRun ? "(DRY RUN)" : ""}`);
  if (options.tag) {
    console.log(`Release Tag:     ${tagName} (${tagAlreadyExists ? "ALREADY EXISTS!" : "Available"})`);
  }
  console.log("------------------------------------------------------------------");

  syncVersions(newVersion, options.dryRun);

  if (options.tag) {
    if (options.dryRun) {
      console.log(`[DRY RUN] Would create Git tag: ${tagName} (skipped)`);
    } else {
      console.log("------------------------------------------------------------------");
      console.log(`Creating immutable Git tag: ${tagName}...`);
      try {
        // Enforce safe tag creation: never use -f or --force
        execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: "inherit" });
        console.log(`[SUCCESS] Git tag '${tagName}' created locally.`);
        console.log(`Tip: To publish tag, run: git push origin ${tagName}`);
      } catch (err: unknown) {
        console.error(`[ERROR] Failed to create git tag '${tagName}': ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }
  }

  return newVersion;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("bump-version.ts")) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const shouldTag = args.includes("--tag");
  const bumpArg = args.find((a) => !a.startsWith("--")) || "patch";

  try {
    bumpVersion(bumpArg, { dryRun: isDryRun, tag: shouldTag });
  } catch (err: unknown) {
    console.error(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
