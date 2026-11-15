import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestApp, type TestAppContext } from "../helpers/test-app";
import { cleanDatabase } from "../helpers/test-db";
import {
  createTestUser,
  createTestOrg,
  createTestCandidate,
  createTestJob,
  createTestApplication,
  generateTestAuthCookie,
} from "../helpers/test-fixtures";
import { JwtService } from "@nestjs/jwt";
import { Role, ApplicationStage } from "@prisma/client";
import { env } from "../../config/env";
import { APP_ERROR_CODES } from "@haihire/shared";

describe("Vitest Integration: Tier 2 Boundary & Corner Cases", () => {
  let ctx: TestAppContext;
  let jwtService: JwtService;

  beforeAll(async () => {
    ctx = await createTestApp();
    jwtService = ctx.app.get(JwtService);
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.close();
    }
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it("T2-INT-01 [F01]: Cross-tenant probe on candidate returns 403 Forbidden", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);
    const candidateA = await createTestCandidate(ctx.prisma, orgA.id);

    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);

    const agent = ctx.createAgent();
    const cookieB = generateTestAuthCookie(jwtService, userB, orgB.id);
    agent.setCookie("haihire_token", cookieB.replace("haihire_token=", ""));

    // User B attempts to access Candidate from Org A
    const res = await agent.get(`/candidates/${candidateA.id}`);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe(APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH);
  });

  it("T2-INT-02 [F02]: Public apply rejects administrative fields with 400 Bad Request", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const agent = ctx.createAgent();
    const maliciousCandidateId = "00000000-0000-4000-8000-000000000999";
    const res = await agent.post("/applications/apply", {
      jobId: job.id,
      firstName: "Injected",
      lastName: "Admin",
      email: `inject-${Date.now()}@example.com`,
      candidateId: maliciousCandidateId,
      resumeUrl: "https://malicious.org/exploit.pdf",
    });

    // Administrative field injection must be strictly rejected with 400
    expect(res.status).toBe(400);
  });

  it("T2-INT-03 [F10]: Malformed UUID parameter triggers 400 Bad Request via ParseUUIDPipe", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get("/candidates/not-a-valid-uuid-format");
    expect(res.status).toBe(400);
  });

  it("T2-INT-04 [F10]: Non-numeric pagination query parameter does not result in NaN", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get(
      `/organizations/my/audit-log?limit=abc&offset=xyz`,
    );
    // DtoPipe validates numeric query params and strictly returns 400 Bad Request
    expect(res.status).toBe(400);
  });

  it("T2-INT-05 [F07]: Missing or invalid METRICS_TOKEN is rejected on all environments with 401", async () => {
    const token = "test-metrics-token-at-least-32-chars-long";
    const previousToken = (env as unknown as { METRICS_TOKEN?: string })
      .METRICS_TOKEN;
    (env as unknown as { METRICS_TOKEN: string }).METRICS_TOKEN = token;

    try {
      const agent = ctx.createAgent();
      // 1. Request with no token
      const resNoToken = await agent.get("/metrics");
      expect(resNoToken.status).toBe(401);

      // 2. Request with invalid token
      const resInvalidToken = await agent.get("/metrics", {
        Authorization: "Bearer invalid-garbage-token",
      });
      expect(resInvalidToken.status).toBe(401);
    } finally {
      (env as unknown as { METRICS_TOKEN?: string }).METRICS_TOKEN =
        previousToken;
    }
  });

  it("T2-INT-06 [F06]: User lacking candidate:update permission is rejected on note creation", async () => {
    const owner = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, owner.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id);

    // Member with read-only role lacking write permissions
    const member = await createTestUser(ctx.prisma, {
      role: Role.MEMBER,
      organizationId: org.id,
    });
    await ctx.prisma.organizationMember.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        userId: member.id,
        role: Role.MEMBER,
      },
    });

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, member, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.post(`/candidates/${candidate.id}/notes`, {
      content: "Unauthorized note creation attempt",
    });

    expect(res.status).toBe(403);
  });

  it("T2-INT-07 [F05]: Request without active tenant membership is rejected by ActiveTenantGuard", async () => {
    // User without any organization membership
    const unattachedUser = await createTestUser(ctx.prisma);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, unattachedUser);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get("/organizations/my");
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe(APP_ERROR_CODES.ORG_FORBIDDEN_ACTION);
  });

  it("T2-INT-08 [F11]: Tampered JWT cookie is rejected with 401 Unauthorized", async () => {
    const agent = ctx.createAgent();
    agent.setCookie("haihire_token", "tampered.jwt.payload.signature");

    const res = await agent.get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("T2-INT-09 [F13]: Inserting active duplicate candidate email in same tenant is rejected with P2002", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const sharedEmail = `duplicate-${Date.now()}@example.com`;

    // 1. Create first active candidate
    await createTestCandidate(ctx.prisma, org.id, { email: sharedEmail });

    // 2. Attempt to create second active candidate with exact same email in same tenant
    let caughtError: unknown = null;
    try {
      await createTestCandidate(ctx.prisma, org.id, { email: sharedEmail });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect((caughtError as { code?: string })?.code).toBe("P2002");
  });

  it("T2-INT-10 [F04]: Uploading file with forbidden extension is rejected with 400 Bad Request", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const formData = new FormData();
    formData.append("jobId", job.id);
    formData.append("firstName", "Bad");
    formData.append("lastName", "Extension");
    formData.append("email", `bad-ext-${Date.now()}@example.com`);
    formData.append(
      "file",
      new Blob(["MZ executed malware"], { type: "application/x-dosexec" }),
      "malware.exe",
    );

    const agent = ctx.createAgent();
    const res = await agent.postMultipart("/applications/apply", formData);
    expect(res.status).toBe(400);
  });

  it("T2-INT-11 [F08]: Connecting to SSE stream with invalid token returns 401 Unauthorized", async () => {
    const res = await ctx.fetch("/events/sse", {
      headers: {
        Cookie: "haihire_token=invalid-bearer-token",
        Accept: "text/event-stream",
      },
    });
    expect(res.status).toBe(401);
  });

  it("T2-INT-12 [F11]: Revoked session via incremented tokenVersion is rejected with 401", async () => {
    const user = await createTestUser(ctx.prisma, { tokenVersion: 0 });
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    // First call succeeds with tokenVersion 0
    const resValid = await agent.get("/auth/me");
    expect(resValid.status).toBe(200);

    // Invalidate session by incrementing tokenVersion in DB
    await ctx.prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: 1 },
    });

    // Subsequent call with old tokenVersion 0 cookie is rejected
    const resInvalid = await agent.get("/auth/me");
    expect(resInvalid.status).toBe(401);
  });

  it("T2-INT-13 [F01]: Cross-tenant application stage update is rejected with 403 Forbidden", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);
    const jobA = await createTestJob(ctx.prisma, orgA.id, userA.id);
    const candidateA = await createTestCandidate(ctx.prisma, orgA.id);
    const appA = await createTestApplication(
      ctx.prisma,
      orgA.id,
      jobA.id,
      candidateA.id,
    );

    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);

    const agent = ctx.createAgent();
    const cookieB = generateTestAuthCookie(jwtService, userB, orgB.id);
    agent.setCookie("haihire_token", cookieB.replace("haihire_token=", ""));

    const res = await agent.patch(`/applications/${appA.id}/stage`, {
      stage: ApplicationStage.SCREENING,
    });
    expect(res.status).toBe(403);
  });

  it("T2-INT-14 [F05]: Querying candidate listing with mismatched foreign organizationId is rejected with 403", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);

    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);

    const agent = ctx.createAgent();
    const cookieA = generateTestAuthCookie(jwtService, userA, orgA.id);
    agent.setCookie("haihire_token", cookieA.replace("haihire_token=", ""));

    // User A passes foreign Org B's ID in query parameter
    const res = await agent.get(`/candidates?organizationId=${orgB.id}`);
    expect(res.status).toBe(403);
  });

  it("T2-INT-15 [F01]: Cross-tenant job deletion is rejected with 403 Forbidden", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);
    const jobA = await createTestJob(ctx.prisma, orgA.id, userA.id);

    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);

    const agent = ctx.createAgent();
    const cookieB = generateTestAuthCookie(jwtService, userB, orgB.id);
    agent.setCookie("haihire_token", cookieB.replace("haihire_token=", ""));

    const res = await agent.delete(`/jobs/${jobA.id}`);
    expect(res.status).toBe(403);
  });

  it("T2-INT-16 [F02]: Public apply with invalid email format is rejected with 400 Bad Request", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const agent = ctx.createAgent();
    const res = await agent.post("/applications/apply", {
      jobId: job.id,
      firstName: "Malformed",
      lastName: "Email",
      email: "not-an-email-address",
    });
    expect(res.status).toBe(400);
  });

  it("T2-INT-17 [F10]: Negative pagination limit returns 400 Bad Request via DtoPipe", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get(
      `/candidates?organizationId=${org.id}&limit=-10`,
    );
    expect(res.status).toBe(400);
  });

  it("T2-INT-18 [F06]: Note creation on non-existent candidate returns 404 Not Found", async () => {
    const user = await createTestUser(ctx.prisma, { role: Role.ADMIN });
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const fakeCandidateId = randomUUID();
    const res = await agent.post(`/candidates/${fakeCandidateId}/notes`, {
      content: "Note for ghost candidate",
    });
    expect(res.status).toBe(404);
  });

  it("T2-INT-19 [F05]: ActiveTenantGuard rejects unattached user querying tenant-scoped resource", async () => {
    const unattachedUser = await createTestUser(ctx.prisma);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, unattachedUser);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get("/candidates");
    expect(res.status).toBe(403);
  });

  it("T2-INT-20 [F02]: Public apply for non-existent job returns 404 Not Found", async () => {
    const agent = ctx.createAgent();
    const fakeJobId = randomUUID();
    const res = await agent.post("/applications/apply", {
      jobId: fakeJobId,
      firstName: "Ghost",
      lastName: "Hunter",
      email: `ghost-${Date.now()}@example.com`,
    });
    expect(res.status).toBe(404);
  });
});
