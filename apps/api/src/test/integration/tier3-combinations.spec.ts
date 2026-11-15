import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
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
import { MinioService } from "../../minio/minio.service";
import { APP_ERROR_CODES } from "@haihire/shared";

describe("Vitest Integration: Tier 3 Cross-Feature Pairwise Combinations", () => {
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

  it("T3-COMB-01 [F01 x F11]: Cookie Auth context strictly constrains data isolation across tenants", async () => {
    // Org Alpha
    const userAlpha = await createTestUser(ctx.prisma);
    const orgAlpha = await createTestOrg(ctx.prisma, userAlpha.id);
    const candidateAlpha = await createTestCandidate(ctx.prisma, orgAlpha.id);

    // Org Beta
    const userBeta = await createTestUser(ctx.prisma);
    const orgBeta = await createTestOrg(ctx.prisma, userBeta.id);
    const candidateBeta = await createTestCandidate(ctx.prisma, orgBeta.id);

    // Alpha Recruiter sends request with Alpha HttpOnly cookie
    const agentAlpha = ctx.createAgent();
    const cookieAlpha = generateTestAuthCookie(
      jwtService,
      userAlpha,
      orgAlpha.id,
    );
    agentAlpha.setCookie(
      "haihire_token",
      cookieAlpha.replace("haihire_token=", ""),
    );

    // Alpha cannot query Beta candidate - strictly 403 Forbidden
    const resBeta = await agentAlpha.get(`/candidates/${candidateBeta.id}`);
    expect(resBeta.status).toBe(403);

    // Alpha CAN query Alpha candidate - strictly 200 OK
    const resAlpha = await agentAlpha.get(`/candidates/${candidateAlpha.id}`);
    expect(resAlpha.status).toBe(200);
  });

  it("T3-COMB-02 [F02 x F12]: Saga transaction rollback guarantees zero orphan records on failure", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const minioService = ctx.app.get(MinioService);
    const deleteSpy = vi.spyOn(minioService, "deleteFile");

    // Simulate database failure during transaction execution
    const txSpy = vi
      .spyOn(ctx.prisma, "transaction")
      .mockRejectedValueOnce(
        new Error(
          "Simulated database failure during application creation transaction",
        ),
      );

    try {
      const email = `saga-fail-${Date.now()}@example.com`;
      const formData = new FormData();
      formData.append("jobId", job.id);
      formData.append("firstName", "Saga");
      formData.append("lastName", "Tester");
      formData.append("email", email);
      formData.append(
        "resume",
        new Blob(["%PDF-1.4 simulated resume for saga test\n%%EOF"], {
          type: "application/pdf",
        }),
        "resume.pdf",
      );

      const agent = ctx.createAgent();
      const res = await agent.postMultipart("/applications/apply", formData);

      // 1. Assert request failed due to transaction rollback
      expect([400, 409, 500]).toContain(res.status);
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);

      // 2. Assert compensating action executed: MinIO file deleted
      expect(deleteSpy).toHaveBeenCalled();

      // 3. Assert database transaction rolled back: candidate and application records do not exist
      const orphanCandidate = await ctx.prisma.candidate.findFirst({
        where: { organizationId: org.id, email },
      });
      expect(orphanCandidate).toBeNull();

      const orphanApp = await ctx.prisma.application.findFirst({
        where: { jobId: job.id, candidate: { email } },
      });
      expect(orphanApp).toBeNull();
    } finally {
      txSpy.mockRestore();
      deleteSpy.mockRestore();
    }
  });

  it("T3-COMB-03 [F12 x F13]: Optimistic Concurrency Control rejects stale version updates", async () => {
    const user = await createTestUser(ctx.prisma, { role: Role.ADMIN });
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id);
    const app = await createTestApplication(
      ctx.prisma,
      org.id,
      job.id,
      candidate.id,
      { stage: ApplicationStage.APPLIED },
    );

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    // Step 1: Valid initial transition
    const validRes = await agent.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.SCREENING,
      version: 1,
    });
    expect(validRes.status).toBe(200);

    const updatedApp = await ctx.prisma.application.findUnique({
      where: { id: app.id },
    });
    expect(updatedApp?.stage).toBe(ApplicationStage.SCREENING);

    // Step 2: Attempt update with deliberately stale version
    const staleRes = await agent.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.INTERVIEW,
      version: 1, // Stale version
    });

    // Strictly assert 409 Conflict (remove 200 and 400)
    expect(staleRes.status).toBe(409);
    const errBody = (await staleRes.json()) as {
      code?: string;
      message?: string;
    };
    expect(errBody.code).toBe(APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT);

    // Step 3: Verify database state was NOT corrupted
    const uncorruptedApp = await ctx.prisma.application.findUnique({
      where: { id: app.id },
    });
    expect(uncorruptedApp?.stage).toBe(ApplicationStage.SCREENING);
  });

  it("T3-COMB-04 [F02 x F13]: Soft-deleted candidate can re-apply creating new active profile", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job1 = await createTestJob(ctx.prisma, org.id, user.id, {
      title: "Job 1",
    });
    const job2 = await createTestJob(ctx.prisma, org.id, user.id, {
      title: "Job 2",
    });
    const email = `softdelete-reapply-${Date.now()}@example.com`;

    // 1. Initial application creates active candidate
    const candidate1 = await createTestCandidate(ctx.prisma, org.id, {
      email,
      firstName: "Initial",
    });
    await createTestApplication(ctx.prisma, org.id, job1.id, candidate1.id, {
      stage: ApplicationStage.REJECTED,
    });

    // 2. Soft-delete the initial candidate
    await ctx.prisma.candidate.update({
      where: { id: candidate1.id },
      data: { deletedAt: new Date() },
    });

    // 3. Candidate re-applies using public portal to Job 2
    const agent = ctx.createAgent();
    const res = await agent.post("/applications/apply", {
      jobId: job2.id,
      firstName: "Reapplied",
      lastName: "Candidate",
      email,
    });

    expect([200, 201]).toContain(res.status);

    // 4. Verify that two candidates exist: one soft-deleted and one active (no resurrection)
    const candidates = await ctx.prisma.candidate.findMany({
      where: { organizationId: org.id, email },
      orderBy: { createdAt: "asc" },
    });

    expect(candidates).toHaveLength(2);
    const [oldCandidate, newCandidate] = candidates;

    expect(oldCandidate.id).not.toBe(newCandidate.id);
    expect(oldCandidate.deletedAt).not.toBeNull();
    expect(newCandidate.deletedAt).toBeNull();

    // Verify applications are attached to their respective candidate instances
    const appOld = await ctx.prisma.application.findFirst({
      where: { candidateId: oldCandidate.id },
    });
    expect(appOld?.jobId).toBe(job1.id);

    const appNew = await ctx.prisma.application.findFirst({
      where: { candidateId: newCandidate.id },
    });
    expect(appNew?.jobId).toBe(job2.id);
  });

  it("T3-COMB-05 [F06 x F09]: Role promotion immediately grants write access for notes", async () => {
    const owner = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, owner.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id);

    const user = await createTestUser(ctx.prisma, { role: Role.MEMBER });
    const membership = await ctx.prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: Role.MEMBER,
      },
    });

    // Promote user to ADMIN
    await ctx.prisma.organizationMember.update({
      where: { id: membership.id },
      data: { role: Role.ADMIN },
    });

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.post(`/candidates/${candidate.id}/notes`, {
      content: "Note created after role promotion",
    });

    expect([200, 201]).toContain(res.status);
  });

  it("T3-COMB-06 [F01 x F06]: Cross-tenant note deletion is rejected with 403 Forbidden", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);
    const candidateA = await createTestCandidate(ctx.prisma, orgA.id);

    // Create note in Org A
    const noteA = await ctx.prisma.candidateNote.create({
      data: {
        id: randomUUID(),
        organizationId: orgA.id,
        candidateId: candidateA.id,
        authorId: userA.id,
        authorName: `${userA.firstName} ${userA.lastName}`.trim() || "User A",
        authorRole: Role.ADMIN,
        content: "Internal note in Org A",
      },
    });

    // User in Org B attempts to delete Org A's note
    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);

    const agent = ctx.createAgent();
    const cookieB = generateTestAuthCookie(jwtService, userB, orgB.id);
    agent.setCookie("haihire_token", cookieB.replace("haihire_token=", ""));

    const res = await agent.delete(
      `/candidates/${candidateA.id}/notes/${noteA.id}`,
    );
    expect(res.status).toBe(403);
  });

  it("T3-COMB-07 [F02 x F04]: Public apply with both tracking link and resume attaches both", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const linkToken = `combo-trk-${Date.now()}`;
    const link = await ctx.prisma.trackingLink.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        name: "Combo Link",
        token: linkToken,
        jobId: job.id,
      },
    });

    const candidateEmail = `combo-${Date.now()}@example.com`;
    const formData = new FormData();
    formData.append("jobId", job.id);
    formData.append("firstName", "Combo");
    formData.append("lastName", "Applicant");
    formData.append("email", candidateEmail);
    formData.append("ref", linkToken);
    formData.append(
      "resume",
      new Blob(["%PDF-1.4 combo test resume\n%%EOF"], {
        type: "application/pdf",
      }),
      "combo-resume.pdf",
    );

    const agent = ctx.createAgent();
    const res = await agent.postMultipart("/applications/apply", formData);
    expect([200, 201]).toContain(res.status);

    const app = await ctx.prisma.application.findFirst({
      where: { jobId: job.id, candidate: { email: candidateEmail } },
    });
    // Link token should be bound
    expect(app).not.toBeNull();
    expect(app?.trackingLinkId).toBe(link.id);
  });

  it("T3-COMB-08 [F05 x F14]: Active tenant context correctly isolates SQL search results", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);

    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);

    const commonName = `SharedSearchName${Date.now()}`;
    const candA = await createTestCandidate(ctx.prisma, orgA.id, {
      firstName: commonName,
      lastName: "OrgA",
    });
    await createTestCandidate(ctx.prisma, orgB.id, {
      firstName: commonName,
      lastName: "OrgB",
    });

    const agent = ctx.createAgent();
    const cookieA = generateTestAuthCookie(jwtService, userA, orgA.id);
    agent.setCookie("haihire_token", cookieA.replace("haihire_token=", ""));

    const res = await agent.get(
      `/candidates?organizationId=${orgA.id}&search=${commonName}`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ id: string; firstName?: string }>;
    };
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(candA.id);
  });

  it("T3-COMB-09 [F10 x F11]: Invalid UUID parameter returns 400 without invalidating auth session", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    // 1. Send invalid UUID request -> 400
    const resBad = await agent.get("/candidates/not-a-valid-uuid");
    expect(resBad.status).toBe(400);

    // 2. Subsequent valid authenticated request succeeds with 200
    const resGood = await agent.get("/auth/me");
    expect(resGood.status).toBe(200);
  });
});
