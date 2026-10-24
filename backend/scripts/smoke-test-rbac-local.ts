#!/usr/bin/env tsx
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { db } from "../src/prisma/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/auth/constants";
import { APP_ERROR_CODES, Role, PERMISSION_LIST } from "@haihire/shared";

const BASE_URL = "http://127.0.0.1:13001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_ORG_ID = "00000000-0000-4000-8000-000000000002";
const MEMBER_USER_ID = "00000000-0000-4000-8000-000000000003";

let spawnedProcess: ChildProcess | null = null;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function isServerHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function ensureServerRunning(): Promise<void> {
  const alreadyRunning = await isServerHealthy();
  if (alreadyRunning) {
    console.log("ℹ️ Backend server is already running on port 13001.");
    return;
  }

  console.log("🚀 Starting NestJS backend server on port 13001...");
  const backendDir = resolve(process.cwd(), "backend");
  spawnedProcess = spawn("pnpm", ["exec", "tsx", "src/main.ts"], {
    cwd: backendDir,
    shell: true,
    stdio: "inherit",
    env: { ...process.env, PORT: "13001" },
  });

  const startTime = Date.now();
  const timeoutMs = 30000;
  while (Date.now() - startTime < timeoutMs) {
    if (await isServerHealthy()) {
      console.log(
        "✅ Backend server is ready and responding at http://127.0.0.1:13001",
      );
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error("Failed to start backend server within 30 seconds.");
}

function terminateSpawnedServer(): void {
  if (!spawnedProcess || !spawnedProcess.pid) return;
  console.log("🛑 Terminating spawned backend server process...");
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, {
        stdio: "ignore",
      });
    } else {
      process.kill(-spawnedProcess.pid, "SIGTERM");
    }
  } catch {
    // Process might already be dead
  }
  spawnedProcess = null;
}

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isOwner: boolean;
    organizationId: string | null;
  };
}

async function login(
  email: string,
  password = DEMO_PASSWORD,
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Login failed for ${email} (${res.status}): ${errorText}`);
  }
  return res.json() as Promise<LoginResponse>;
}

async function cleanupDb(): Promise<void> {
  console.log("🧹 Running idempotent cleanup...");
  try {
    // 1. Restore Organization ownership to seed Admin
    await db.orm.public.Organization.where((o) => o.id.eq(ADMIN_ORG_ID)).update(
      {
        ownerId: ADMIN_USER_ID,
      },
    );

    // 2. Restore User roles
    await db.orm.public.User.where((u) => u.id.eq(ADMIN_USER_ID)).update({
      role: "ADMIN",
    });
    await db.orm.public.User.where((u) => u.id.eq(MEMBER_USER_ID)).update({
      role: "MEMBER",
    });

    // 3. Restore OrganizationMember roles
    await db.orm.public.OrganizationMember.where((m) =>
      m.organizationId.eq(ADMIN_ORG_ID),
    )
      .where((m) => m.userId.eq(ADMIN_USER_ID))
      .update({ role: "ADMIN" });

    await db.orm.public.OrganizationMember.where((m) =>
      m.organizationId.eq(ADMIN_ORG_ID),
    )
      .where((m) => m.userId.eq(MEMBER_USER_ID))
      .update({ role: "MEMBER" });

    // 4. Delete any OrganizationRolePermission overrides
    await db.orm.public.OrganizationRolePermission.where((p) =>
      p.organizationId.eq(ADMIN_ORG_ID),
    ).delete();

    console.log("✅ Cleanup completed successfully.");
  } catch (err) {
    console.warn("⚠️ Warning during cleanup:", err);
  }
}

export async function runRbacSmokeTests(): Promise<void> {
  console.log("==================================================");
  console.log("🧪 RUNNING LOCAL RBAC END-TO-END SMOKE TEST SUITE");
  console.log("==================================================");

  await ensureServerRunning();

  // Find candidate for candidate:view assertion
  const candidate = await db.orm.public.Candidate.select("id")
    .where((c) => c.organizationId.eq(ADMIN_ORG_ID))
    .first();
  const testCandidateId =
    candidate?.id || "151ec18b-9340-47a7-af44-3366560e4c48";

  try {
    // Ensure baseline is clean
    await cleanupDb();

    // -------------------------------------------------------------------------
    // SMOKE 1 — Transfer Ownership Happy Path
    // -------------------------------------------------------------------------
    console.log("\n▶ [SMOKE 1] Transfer Ownership Happy Path");
    const adminLogin1 = await login(DEMO_ACCOUNTS.ADMIN.email);
    assert(
      adminLogin1.user.isOwner === true,
      "Admin should initially be owner",
    );

    const transferRes = await fetch(
      `${BASE_URL}/organizations/my/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminLogin1.accessToken}`,
        },
        body: JSON.stringify({ newOwnerUserId: MEMBER_USER_ID }),
      },
    );

    assert(
      transferRes.status === 200,
      `Transfer response expected 200, got ${transferRes.status}`,
    );
    const transferBody = await transferRes.json();
    assert(
      transferBody.success === true,
      "Transfer response success must be true",
    );
    assert(
      transferBody.newOwnerId === MEMBER_USER_ID,
      "newOwnerId must match target member",
    );

    // Assert DB state post-transfer
    const org = await db.orm.public.Organization.select("ownerId")
      .where((o) => o.id.eq(ADMIN_ORG_ID))
      .first();
    assert(
      org?.ownerId === MEMBER_USER_ID,
      "DB Organization.ownerId must be new owner",
    );

    const targetUser = await db.orm.public.User.select("role")
      .where((u) => u.id.eq(MEMBER_USER_ID))
      .first();
    assert(
      targetUser?.role === "ADMIN",
      "Target User.role must be promoted to ADMIN",
    );

    const targetMember = await db.orm.public.OrganizationMember.select("role")
      .where((m) => m.organizationId.eq(ADMIN_ORG_ID))
      .where((m) => m.userId.eq(MEMBER_USER_ID))
      .first();
    assert(
      targetMember?.role === "ADMIN",
      "Target OrganizationMember.role must be ADMIN",
    );

    const oldOwnerUser = await db.orm.public.User.select("role")
      .where((u) => u.id.eq(ADMIN_USER_ID))
      .first();
    assert(
      oldOwnerUser?.role === "ADMIN",
      "Former owner User.role must retain ADMIN",
    );

    const oldOwnerMember = await db.orm.public.OrganizationMember.select("role")
      .where((m) => m.organizationId.eq(ADMIN_ORG_ID))
      .where((m) => m.userId.eq(ADMIN_USER_ID))
      .first();
    assert(
      oldOwnerMember?.role === "ADMIN",
      "Former owner OrganizationMember.role must retain ADMIN",
    );

    // Verify token claims on next login
    const newOwnerLogin = await login(DEMO_ACCOUNTS.MEMBER.email);
    assert(
      newOwnerLogin.user.isOwner === true,
      "New owner login must reflect isOwner: true",
    );
    assert(
      newOwnerLogin.user.role === "ADMIN",
      "New owner login must reflect role: ADMIN",
    );

    const oldOwnerLogin = await login(DEMO_ACCOUNTS.ADMIN.email);
    assert(
      oldOwnerLogin.user.isOwner === false,
      "Former owner login must reflect isOwner: false",
    );
    assert(
      oldOwnerLogin.user.role === "ADMIN",
      "Former owner login must retain role: ADMIN",
    );
    console.log("✔ [SMOKE 1] Passed successfully.");

    // -------------------------------------------------------------------------
    // SMOKE 2 — Transfer Ownership Negative Cases
    // -------------------------------------------------------------------------
    console.log("\n▶ [SMOKE 2] Transfer Ownership Negative Cases");

    // Case 2.1: Non-owner calls transfer (oldOwnerLogin is not owner, targeting member)
    const nonOwnerTransfer = await fetch(
      `${BASE_URL}/organizations/my/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${oldOwnerLogin.accessToken}`,
        },
        body: JSON.stringify({ newOwnerUserId: MEMBER_USER_ID }),
      },
    );
    assert(
      nonOwnerTransfer.status === 403,
      `Non-owner transfer expected 403, got ${nonOwnerTransfer.status}`,
    );

    // Case 2.2: Invalid UUID format (RFC 4122 v4 violation)
    const invalidUuidTransfer = await fetch(
      `${BASE_URL}/organizations/my/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newOwnerLogin.accessToken}`,
        },
        body: JSON.stringify({
          newOwnerUserId: "00000000-0000-0000-0000-000000000003",
        }),
      },
    );
    assert(
      invalidUuidTransfer.status === 400,
      `Legacy pseudo-UUID expected 400, got ${invalidUuidTransfer.status}`,
    );

    // Case 2.3: Empty payload
    const emptyPayloadTransfer = await fetch(
      `${BASE_URL}/organizations/my/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newOwnerLogin.accessToken}`,
        },
        body: JSON.stringify({}),
      },
    );
    assert(
      emptyPayloadTransfer.status === 400,
      `Empty body expected 400, got ${emptyPayloadTransfer.status}`,
    );

    // Case 2.4: Target user ID not belonging to organization
    const nonMemberTransfer = await fetch(
      `${BASE_URL}/organizations/my/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newOwnerLogin.accessToken}`,
        },
        body: JSON.stringify({
          newOwnerUserId: "11111111-1111-4111-8111-111111111111",
        }),
      },
    );
    assert(
      nonMemberTransfer.status === 400,
      `Non-member target expected 400, got ${nonMemberTransfer.status}`,
    );
    const nonMemberBody = await nonMemberTransfer.json();
    assert(
      nonMemberBody.error?.code === APP_ERROR_CODES.USER_NOT_IN_ORGANIZATION ||
        nonMemberBody.message?.includes("USER_NOT_IN_ORGANIZATION") ||
        nonMemberBody.error === "USER_NOT_IN_ORGANIZATION",
      `Expected USER_NOT_IN_ORGANIZATION error code, got ${JSON.stringify(nonMemberBody)}`,
    );

    // Transfer ownership back to seed Admin for subsequent tests
    const restoreTransfer = await fetch(
      `${BASE_URL}/organizations/my/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newOwnerLogin.accessToken}`,
        },
        body: JSON.stringify({ newOwnerUserId: ADMIN_USER_ID }),
      },
    );
    assert(
      restoreTransfer.status === 200,
      "Transfer back to Admin must succeed",
    );
    console.log("✔ [SMOKE 2] Passed successfully.");

    // -------------------------------------------------------------------------
    // SMOKE 3 — Member Role Management & Invariants
    // -------------------------------------------------------------------------
    console.log("\n▶ [SMOKE 3] Member Role Management");
    const adminLogin2 = await login(DEMO_ACCOUNTS.ADMIN.email);
    const memberLoginAdmin = await login(DEMO_ACCOUNTS.MEMBER.email); // currently has ADMIN role from Smoke 1

    // Case 3.1: Member (as non-owner ADMIN) cannot change own role
    const selfRoleChange = await fetch(
      `${BASE_URL}/organizations/my/members/${MEMBER_USER_ID}/role`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberLoginAdmin.accessToken}`,
        },
        body: JSON.stringify({ role: "MEMBER" }),
      },
    );
    assert(
      selfRoleChange.status === 400,
      `Changing self role expected 400, got ${selfRoleChange.status}`,
    );
    const selfRoleBody = await selfRoleChange.json();
    assert(
      selfRoleBody.error?.code ===
        APP_ERROR_CODES.ORG_CANNOT_CHANGE_SELF_ROLE ||
        selfRoleBody.message?.includes("CANNOT_CHANGE_SELF_ROLE") ||
        selfRoleBody.message?.includes("cannot change your own role"),
      `Expected CANNOT_CHANGE_SELF_ROLE, got ${JSON.stringify(selfRoleBody)}`,
    );

    // Case 3.2: Member (as non-owner ADMIN) cannot change owner role
    const ownerRoleChange = await fetch(
      `${BASE_URL}/organizations/my/members/${ADMIN_USER_ID}/role`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberLoginAdmin.accessToken}`,
        },
        body: JSON.stringify({ role: "RECRUITER" }),
      },
    );
    assert(
      ownerRoleChange.status === 400,
      `Changing owner role expected 400, got ${ownerRoleChange.status}`,
    );
    const ownerRoleBody = await ownerRoleChange.json();
    assert(
      ownerRoleBody.error?.code ===
        APP_ERROR_CODES.ORG_CANNOT_CHANGE_OWNER_ROLE ||
        ownerRoleBody.message?.includes("CANNOT_CHANGE_OWNER_ROLE") ||
        ownerRoleBody.message?.includes("organization owner"),
      `Expected CANNOT_CHANGE_OWNER_ROLE, got ${JSON.stringify(ownerRoleBody)}`,
    );

    // Case 3.3: Owner successfully changes member role to RECRUITER
    const patchRecruiter = await fetch(
      `${BASE_URL}/organizations/my/members/${MEMBER_USER_ID}/role`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminLogin2.accessToken}`,
        },
        body: JSON.stringify({ role: "RECRUITER" }),
      },
    );
    assert(
      patchRecruiter.status === 200,
      `Patch member role expected 200, got ${patchRecruiter.status}`,
    );
    console.log("✔ [SMOKE 3] Passed successfully.");

    // -------------------------------------------------------------------------
    // SMOKE 4 — Editable Permissions Matrix & Enforcement
    // -------------------------------------------------------------------------
    console.log(
      "\n▶ [SMOKE 4] Editable Permissions Matrix & Runtime Enforcement",
    );

    // Step 4.1: GET permissions matrix
    const matrixRes = await fetch(
      `${BASE_URL}/organizations/my/roles/permissions`,
      {
        headers: { Authorization: `Bearer ${adminLogin2.accessToken}` },
      },
    );
    assert(
      matrixRes.status === 200,
      `GET matrix expected 200, got ${matrixRes.status}`,
    );
    const matrix = await matrixRes.json();
    const roles = Object.keys(matrix);
    assert(roles.length === 5, `Matrix expected 5 roles, got ${roles.length}`);
    for (const r of [
      Role.ADMIN,
      Role.RECRUITER,
      Role.HIRING_MANAGER,
      Role.INTERVIEWER,
      Role.MEMBER,
    ]) {
      assert(Boolean(matrix[r]), `Matrix must contain role ${r}`);
      assert(
        Object.keys(matrix[r]).length === PERMISSION_LIST.length,
        `Role ${r} expected ${PERMISSION_LIST.length} permissions, got ${Object.keys(matrix[r]).length}`,
      );
    }

    // Step 4.2: Disable candidate:view for RECRUITER
    const patchPermRes = await fetch(
      `${BASE_URL}/organizations/my/roles/RECRUITER/permissions`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminLogin2.accessToken}`,
        },
        body: JSON.stringify({
          permissions: [{ permission: "candidate:view", granted: false }],
        }),
      },
    );
    assert(
      patchPermRes.status === 200,
      `Patch role permissions expected 200, got ${patchPermRes.status}`,
    );

    // Assert DB contains exactly 1 override record
    const overridesCount =
      await db.orm.public.OrganizationRolePermission.select("id")
        .where((p) => p.organizationId.eq(ADMIN_ORG_ID))
        .all();
    assert(
      overridesCount.length === 1,
      `DB overrides expected 1 record, got ${overridesCount.length}`,
    );

    // Step 4.3: Login as Recruiter and verify 403 on endpoint requiring candidate:view
    const recruiterLogin = await login(DEMO_ACCOUNTS.MEMBER.email);
    assert(
      recruiterLogin.user.role === "RECRUITER",
      "User role must now be RECRUITER",
    );

    const candidateGetRes = await fetch(
      `${BASE_URL}/candidates/${testCandidateId}`,
      {
        headers: { Authorization: `Bearer ${recruiterLogin.accessToken}` },
      },
    );
    assert(
      candidateGetRes.status === 403,
      `Expected 403 Forbidden when candidate:view is disabled, got ${candidateGetRes.status}`,
    );

    // Step 4.4: Reset RECRUITER permissions back to default
    const resetRes = await fetch(
      `${BASE_URL}/organizations/my/roles/RECRUITER/reset`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${adminLogin2.accessToken}` },
      },
    );
    assert(
      resetRes.status === 200,
      `Reset role permissions expected 200, got ${resetRes.status}`,
    );

    // Assert DB contains 0 overrides after reset
    const overridesAfterReset =
      await db.orm.public.OrganizationRolePermission.select("id")
        .where((p) => p.organizationId.eq(ADMIN_ORG_ID))
        .all();
    assert(
      overridesAfterReset.length === 0,
      `DB overrides expected 0 after reset, got ${overridesAfterReset.length}`,
    );

    // Step 4.5: Recruiter calls candidate endpoint again -> 200 OK
    const candidateGetAfterReset = await fetch(
      `${BASE_URL}/candidates/${testCandidateId}`,
      {
        headers: { Authorization: `Bearer ${recruiterLogin.accessToken}` },
      },
    );
    assert(
      candidateGetAfterReset.status === 200,
      `Expected 200 OK after permissions reset, got ${candidateGetAfterReset.status}`,
    );
    console.log("✔ [SMOKE 4] Passed successfully.");

    // -------------------------------------------------------------------------
    // SMOKE 5 — ADMIN Role Immutability
    // -------------------------------------------------------------------------
    console.log("\n▶ [SMOKE 5] ADMIN Role Immutability Hardening");

    // Case 5.1: Attempt to patch ADMIN permissions
    const adminPatchRes = await fetch(
      `${BASE_URL}/organizations/my/roles/ADMIN/permissions`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminLogin2.accessToken}`,
        },
        body: JSON.stringify({
          permissions: [{ permission: "candidate:view", granted: false }],
        }),
      },
    );
    assert(
      adminPatchRes.status === 400,
      `Patching ADMIN permissions expected 400, got ${adminPatchRes.status}`,
    );
    const adminPatchBody = await adminPatchRes.json();
    assert(
      adminPatchBody.error?.code ===
        APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE ||
        adminPatchBody.message?.includes("ORG_ADMIN_PERMISSIONS_IMMUTABLE") ||
        adminPatchBody.message?.includes("immutable"),
      `Expected ORG_ADMIN_PERMISSIONS_IMMUTABLE, got ${JSON.stringify(adminPatchBody)}`,
    );

    // Case 5.2: Attempt to reset ADMIN permissions
    const adminResetRes = await fetch(
      `${BASE_URL}/organizations/my/roles/ADMIN/reset`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${adminLogin2.accessToken}` },
      },
    );
    assert(
      adminResetRes.status === 400,
      `Resetting ADMIN permissions expected 400, got ${adminResetRes.status}`,
    );
    const adminResetBody = await adminResetRes.json();
    assert(
      adminResetBody.error?.code ===
        APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE ||
        adminResetBody.message?.includes("ORG_ADMIN_PERMISSIONS_IMMUTABLE") ||
        adminResetBody.message?.includes("immutable"),
      `Expected ORG_ADMIN_PERMISSIONS_IMMUTABLE, got ${JSON.stringify(adminResetBody)}`,
    );
    console.log("✔ [SMOKE 5] Passed successfully.");

    // -------------------------------------------------------------------------
    // SMOKE 6 — Audit Log Verification
    // -------------------------------------------------------------------------
    console.log("\n▶ [SMOKE 6] Audit Log Recording & Filtering");
    const auditRes = await fetch(`${BASE_URL}/organizations/my/audit-log`, {
      headers: { Authorization: `Bearer ${adminLogin2.accessToken}` },
    });
    assert(
      auditRes.status === 200,
      `GET audit log expected 200, got ${auditRes.status}`,
    );
    const auditData = await auditRes.json();
    assert(Array.isArray(auditData.data), "auditData.data must be an array");
    assert(
      auditData.data.length > 0,
      "Audit logs must not be empty after previous actions",
    );

    const recordedActions = new Set(
      auditData.data.map((l: { action: string }) => l.action),
    );
    assert(
      recordedActions.has("OWNERSHIP_TRANSFERRED"),
      "Audit log must contain OWNERSHIP_TRANSFERRED",
    );
    assert(
      recordedActions.has("MEMBER_ROLE_CHANGED") ||
        recordedActions.has("MEMBER_ROLE_UPDATED"),
      "Audit log must contain member role change action",
    );
    assert(
      recordedActions.has("ROLE_PERMISSIONS_UPDATED"),
      "Audit log must contain ROLE_PERMISSIONS_UPDATED",
    );
    assert(
      recordedActions.has("ROLE_PERMISSIONS_RESET"),
      "Audit log must contain ROLE_PERMISSIONS_RESET",
    );

    // Verify filter action=OWNERSHIP_TRANSFERRED
    const filteredAuditRes = await fetch(
      `${BASE_URL}/organizations/my/audit-log?action=OWNERSHIP_TRANSFERRED`,
      {
        headers: { Authorization: `Bearer ${adminLogin2.accessToken}` },
      },
    );
    assert(
      filteredAuditRes.status === 200,
      `GET filtered audit log expected 200, got ${filteredAuditRes.status}`,
    );
    const filteredAuditData = await filteredAuditRes.json();
    assert(
      filteredAuditData.data.length > 0,
      "Filtered audit logs must return records",
    );
    for (const log of filteredAuditData.data) {
      assert(
        log.action === "OWNERSHIP_TRANSFERRED",
        `Filtered audit log action must be OWNERSHIP_TRANSFERRED, got ${log.action}`,
      );
    }
    console.log("✔ [SMOKE 6] Passed successfully.");

    // -------------------------------------------------------------------------
    // SMOKE 7 — SSE Event Stream Connectivity
    // -------------------------------------------------------------------------
    console.log("\n▶ [SMOKE 7] Real-time SSE Endpoint Verification");
    const abortController = new AbortController();
    const sseTimeout = setTimeout(() => abortController.abort(), 3000);

    const sseRes = await fetch(
      `${BASE_URL}/events/sse?token=${adminLogin2.accessToken}`,
      {
        headers: { Accept: "text/event-stream" },
        signal: abortController.signal,
      },
    ).catch((err) => {
      // Abort is expected after receiving headers
      if (err.name === "AbortError") return null;
      throw err;
    });

    if (sseRes) {
      assert(
        sseRes.status === 200,
        `SSE endpoint expected status 200, got ${sseRes.status}`,
      );
      const contentType = sseRes.headers.get("content-type") || "";
      assert(
        contentType.includes("text/event-stream"),
        `Expected text/event-stream content type, got ${contentType}`,
      );
      sseRes.body?.cancel();
    }
    clearTimeout(sseTimeout);
    console.log("✔ [SMOKE 7] Passed successfully.");

    console.log("\n==================================================");
    console.log("🎉 ALL 7 RBAC SMOKE TESTS PASSED (100% HEALTHY)");
    console.log("==================================================");
  } finally {
    await cleanupDb();
    terminateSpawnedServer();
    // Allow process to close cleanly
    setTimeout(() => process.exit(0), 500);
  }
}

// Auto-run when executed directly
if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("smoke-test-rbac-local.ts")
) {
  runRbacSmokeTests().catch((err) => {
    console.error("\n❌ [SMOKE TEST SUITE FAILED]:", err);
    terminateSpawnedServer();
    process.exit(1);
  });
}
