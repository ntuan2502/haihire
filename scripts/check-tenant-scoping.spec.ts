import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  findTenantServiceFiles,
  checkTenantScoping,
  formatReport,
} from "./check-tenant-scoping.ts";
import {
  MODELS_WITHOUT_ORG_COLUMN,
  NON_TENANT_SCOPED_FILES,
  TENANT_SCOPED_MODULES,
} from "./tenant-scoping.config.ts";

describe("Tenant Scoping Static Analysis Gate (check-tenant-scoping)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-scoping-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test Case 1: Parses services directory correctly, covers all tenant-scoped modules
  it("Test 1: parses services directory correctly, covers all tenant-scoped modules", () => {
    const files = findTenantServiceFiles();
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const mod of TENANT_SCOPED_MODULES) {
      const matched = files.some((f) => f.replace(/\\/g, "/").includes(`/${mod}/`));
      expect(matched).toBe(true);
    }
  });

  // Test Case 2: Detects query with organizationId filter -> SAFE
  it("Test 2: detects query with organizationId filter -> SAFE", () => {
    const testFile = path.join(tempDir, "sample.service.ts");
    const code = `
@Injectable()
export class SampleService {
  async findJobs(organizationId: string) {
    return this.prisma.db.orm.public.Job
      .where((j) => j.organizationId.eq(organizationId))
      .all();
  }
}
`;
    fs.writeFileSync(testFile, code, "utf-8");

    const result = checkTenantScoping({ files: [testFile] });
    expect(result.compliant).toBe(true);
    expect(result.totalQueries).toBe(1);
    expect(result.safeQueries).toBe(1);
    expect(result.unsafeQueries).toBe(0);
    expect(result.explicitFilterCount).toBe(1);
    expect(result.violations).toHaveLength(0);
  });

  // Test Case 3: Detects query without organizationId in tenant-scoped context -> UNSAFE
  it("Test 3: detects query without organizationId in tenant-scoped context -> UNSAFE", () => {
    const testFile = path.join(tempDir, "unsafe.service.ts");
    const code = `
@Injectable()
export class UnsafeService {
  async getUnscopedCandidates() {
    return this.prisma.db.orm.public.Candidate.all();
  }
}
`;
    fs.writeFileSync(testFile, code, "utf-8");

    const result = checkTenantScoping({ files: [testFile] });
    expect(result.compliant).toBe(false);
    expect(result.totalQueries).toBe(1);
    expect(result.safeQueries).toBe(0);
    expect(result.unsafeQueries).toBe(1);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].model).toBe("Candidate");
    expect(result.violations[0].reason).toContain("No organizationId filter");
  });

  // Test Case 4: Whitelist model (Interview, Application) query -> SAFE even without organizationId
  it("Test 4: whitelist model (Interview) query -> SAFE even without organizationId", () => {
    const testFile = path.join(tempDir, "interview.service.ts");
    const code = `
@Injectable()
export class InterviewService {
  async getInterviewsByApp(applicationId: string) {
    return this.prisma.db.orm.public.Interview
      .where((i) => i.applicationId.eq(applicationId))
      .all();
  }
}
`;
    fs.writeFileSync(testFile, code, "utf-8");

    const result = checkTenantScoping({ files: [testFile] });
    expect(result.compliant).toBe(true);
    expect(result.totalQueries).toBe(1);
    expect(result.safeQueries).toBe(1);
    expect(result.modelWhitelistCount).toBe(1);
    expect(result.violations).toHaveLength(0);
  });

  // Test Case 5: Whitelist file (auth.service.ts, users.service.ts) -> skipped
  it("Test 5: whitelist file (auth.service.ts) -> skipped", () => {
    const allFiles = findTenantServiceFiles();
    const hasAuth = allFiles.some((f) => f.includes("auth.service.ts"));
    const hasUsers = allFiles.some((f) => f.includes("users.service.ts"));
    const hasApp = allFiles.some((f) => f.includes("app.service.ts"));

    expect(hasAuth).toBe(false);
    expect(hasUsers).toBe(false);
    expect(hasApp).toBe(false);
  });

  // Test Case 6: Query after parent verification (function has .organizationId !==) -> SAFE
  it("Test 6: query after parent verification (function has .organizationId !==) -> SAFE", () => {
    const testFile = path.join(tempDir, "guarded.service.ts");
    const code = `
@Injectable()
export class GuardedService {
  async updateCandidate(id: string, tenantOrgId: string) {
    const existing = await this.findOne(id, tenantOrgId);
    if (existing.organizationId !== tenantOrgId) {
      throw new AppForbiddenException("Denied");
    }
    return tx.orm.public.Candidate.where((c) => c.id.eq(id)).update({ status: "ACTIVE" });
  }
}
`;
    fs.writeFileSync(testFile, code, "utf-8");

    const result = checkTenantScoping({ files: [testFile] });
    expect(result.compliant).toBe(true);
    expect(result.totalQueries).toBe(1);
    expect(result.safeQueries).toBe(1);
    expect(result.parentGuardCount).toBe(1);
    expect(result.violations).toHaveLength(0);
  });

  // Test Case 7: Output format matches expected (contains CI GATE PASSED/FAILED)
  it("Test 7: output format matches expected (contains CI GATE PASSED/FAILED)", () => {
    const passedReport = formatReport({
      compliant: true,
      totalFiles: 8,
      totalQueries: 213,
      safeQueries: 213,
      unsafeQueries: 0,
      explicitFilterCount: 104,
      modelWhitelistCount: 75,
      parentGuardCount: 34,
      patternMatchCount: 0,
      violations: [],
      scannedFiles: ["file1.ts"],
    });

    expect(passedReport).toContain("[CI GATE PASSED]");
    expect(passedReport).toContain("All 213 tenant-scoped queries are properly isolated!");

    const failedReport = formatReport({
      compliant: false,
      totalFiles: 1,
      totalQueries: 1,
      safeQueries: 0,
      unsafeQueries: 1,
      explicitFilterCount: 0,
      modelWhitelistCount: 0,
      parentGuardCount: 0,
      patternMatchCount: 0,
      violations: [
        {
          file: "backend/src/candidates/candidates.service.ts",
          line: 42,
          model: "Candidate",
          snippet: "Candidate.all()",
          reason: "No organizationId filter and parent not verified.",
        },
      ],
      scannedFiles: ["candidates.service.ts"],
    });

    expect(failedReport).toContain("[CI GATE FAILED]");
    expect(failedReport).toContain("Found 1 unsafe queries:");
    expect(failedReport).toContain("ACTION REQUIRED:");
  });

  // Test Case 8: Non-compliant result yields violations and marks compliant = false
  it("Test 8: non-compliant result returns compliant: false with detailed violation info", () => {
    const testFile = path.join(tempDir, "multi-violation.service.ts");
    const code = `
@Injectable()
export class MultiViolationService {
  async dangerousDelete(id: string) {
    await this.prisma.db.orm.public.Job.where((j) => j.id.eq(id)).delete();
  }
}
`;
    fs.writeFileSync(testFile, code, "utf-8");

    const result = checkTenantScoping({ files: [testFile] });
    expect(result.compliant).toBe(false);
    expect(result.unsafeQueries).toBe(1);
    expect(result.violations[0].model).toBe("Job");
    expect(result.violations[0].line).toBe(5);
  });

  // Test Case 9: Safe query patterns (/findBySlug/, /healthCheck/) -> SAFE
  it("Test 9: safe query patterns (/findBySlug/) -> SAFE", () => {
    const testFile = path.join(tempDir, "public.service.ts");
    const code = `
@Injectable()
export class PublicJobsService {
  async findBySlug(slug: string) {
    return this.prisma.db.orm.public.Job.where((j) => j.slug.eq(slug)).first();
  }
}
`;
    fs.writeFileSync(testFile, code, "utf-8");

    const result = checkTenantScoping({ files: [testFile] });
    expect(result.compliant).toBe(true);
    expect(result.patternMatchCount).toBe(1);
    expect(result.violations).toHaveLength(0);
  });
});
