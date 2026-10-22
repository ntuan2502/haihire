import * as fs from "node:fs";
import * as path from "node:path";

export interface ActionViolation {
  file: string;
  line: number;
  action: string;
  currentVersion: string;
  minimumVersion: string;
  message: string;
}

export interface CheckGithubActionOptions {
  workflowsDir?: string;
  files?: Record<string, string>; // Optional virtual file map for testing
}

export interface CheckGithubActionResult {
  passed: boolean;
  violations: ActionViolation[];
}

export const MINIMUM_ACTION_VERSIONS: Record<string, string> = {
  "dorny/paths-filter": "v4",
  "actions/checkout": "v5",
  "actions/setup-node": "v5",
  "actions/cache": "v5",
  "actions/upload-artifact": "v6",
  "actions/download-artifact": "v6",
};

export function parseMajorVersion(versionStr: string): number | null {
  const clean = versionStr.replace(/^v/i, "").trim();
  const major = parseInt(clean.split(".")[0], 10);
  return isNaN(major) ? null : major;
}

export function auditWorkflowContent(
  content: string,
  filePath: string,
): ActionViolation[] {
  const violations: ActionViolation[] = [];
  const lines = content.split("\n");

  const usesRegex = /uses:\s*([^@\s]+)@(\S+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(usesRegex);
    if (!match) continue;

    const action = match[1].trim();
    const version = match[2].trim();

    const minVersionStr = MINIMUM_ACTION_VERSIONS[action];
    if (!minVersionStr) continue; // Skip unknown actions

    const currentMajor = parseMajorVersion(version);
    const minMajor = parseMajorVersion(minVersionStr);

    if (currentMajor !== null && minMajor !== null && currentMajor < minMajor) {
      violations.push({
        file: filePath,
        line: i + 1,
        action,
        currentVersion: version,
        minimumVersion: minVersionStr,
        message: `${action}@${version} is deprecated (Node 20). Use ${action}@${minVersionStr} or newer.`,
      });
    }
  }

  return violations;
}

export function checkGithubActionVersions(
  options: CheckGithubActionOptions = {},
): CheckGithubActionResult {
  const violations: ActionViolation[] = [];

  if (options.files) {
    for (const [filePath, content] of Object.entries(options.files)) {
      violations.push(...auditWorkflowContent(content, filePath));
    }
    return {
      passed: violations.length === 0,
      violations,
    };
  }

  const workflowsDir =
    options.workflowsDir || path.join(process.cwd(), ".github/workflows");

  if (!fs.existsSync(workflowsDir)) {
    return { passed: true, violations: [] };
  }

  const workflowFiles = fs
    .readdirSync(workflowsDir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  for (const file of workflowFiles) {
    const fullPath = path.join(workflowsDir, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    violations.push(...auditWorkflowContent(content, file));
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

// Direct CLI execution
if (
  process.argv[1] &&
  process.argv[1].endsWith("check-github-action-versions.ts")
) {
  console.log(
    "==================================================================",
  );
  console.log("   CI ARCHITECTURE GATE: GITHUB ACTION MINIMUM VERSIONS AUDIT");
  console.log(
    "==================================================================",
  );

  const result = checkGithubActionVersions();

  if (!result.passed) {
    console.error(
      "❌ CI Gate 'lint:github-action-versions' FAILED with violations:",
    );
    for (const v of result.violations) {
      console.error(`   • [${v.file}:${v.line}] ${v.message}`);
    }
    process.exit(1);
  }

  console.log(
    "✅ CI Gate 'lint:github-action-versions' PASSED! All action versions conform to Node 24 policy.",
  );
  for (const [action, min] of Object.entries(MINIMUM_ACTION_VERSIONS)) {
    console.log(`   • ${action.padEnd(25)} >= ${min}`);
  }
  console.log(
    "==================================================================",
  );
}
