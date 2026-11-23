import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestApp, type TestAppContext } from "../helpers/test-app";
import { cleanDatabase } from "../helpers/test-db";
import {
  createTestUser,
  createTestOrg,
  createTestJob,
  createTestCandidate,
  createTestApplication,
  generateTestAuthCookie,
} from "../helpers/test-fixtures";
import { JwtService } from "@nestjs/jwt";
import { ApplicationStage, Role, SourcingChannel } from "@prisma/client";
import { APP_ERROR_CODES } from "@haihire/shared";

describe("Vitest Integration: Tier 4 Real-World Recruitment Workloads", () => {
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

  it("Workload 1: Complete Soft-Delete & Re-application Lifecycle", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job1 = await createTestJob(ctx.prisma, org.id, user.id, {
      title: "Backend Engineer",
    });
    const job2 = await createTestJob(ctx.prisma, org.id, user.id, {
      title: "Frontend Engineer",
    });

    const email = `workload-softdelete-${Date.now()}@example.com`;

    // Step 1: Candidate applies to Job 1
    const candidate1 = await createTestCandidate(ctx.prisma, org.id, {
      email,
      firstName: "Jane",
      lastName: "Doe",
    });
    const app1 = await createTestApplication(
      ctx.prisma,
      org.id,
      job1.id,
      candidate1.id,
      { stage: ApplicationStage.APPLIED },
    );

    // Step 2: Recruiter reviews and rejects application, then soft-deletes candidate
    await ctx.prisma.application.update({
      where: { id: app1.id },
      data: { stage: ApplicationStage.REJECTED },
    });
    const softDeleted = await ctx.prisma.candidate.update({
      where: { id: candidate1.id },
      data: { deletedAt: new Date() },
    });
    expect(softDeleted.deletedAt).not.toBeNull();

    // Step 3: Candidate re-applies later to Job 2 using exact same email
    const agent = ctx.createAgent();
    const reapplyRes = await agent.post("/applications/apply", {
      jobId: job2.id,
      firstName: "Jane",
      lastName: "Doe",
      email,
    });
    expect([200, 201]).toContain(reapplyRes.status);

    // Step 4: Verify independent active record created without resurrecting old state
    const activeCandidates = await ctx.prisma.candidate.findMany({
      where: {
        organizationId: org.id,
        email,
        deletedAt: null,
      },
    });
    expect(activeCandidates.length).toBe(1);
    expect(activeCandidates[0].id).not.toBe(candidate1.id);
  });

  it("Workload 2: Sequential Pipeline Transitions (Screen -> Interview -> Offer -> Hire)", async () => {
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

    // Stage 1 -> SCREENING (Strict 200 + DB verification)
    const res1 = await agent.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.SCREENING,
    });
    expect(res1.status).toBe(200);
    let currentApp = await ctx.prisma.application.findUnique({
      where: { id: app.id },
    });
    expect(currentApp?.stage).toBe(ApplicationStage.SCREENING);

    // Stage 2 -> INTERVIEW (Strict 200 + DB verification)
    const res2 = await agent.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.INTERVIEW,
    });
    expect(res2.status).toBe(200);
    currentApp = await ctx.prisma.application.findUnique({
      where: { id: app.id },
    });
    expect(currentApp?.stage).toBe(ApplicationStage.INTERVIEW);

    // Stage 3 -> OFFER (Strict 200 + DB verification)
    const res3 = await agent.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.OFFER,
    });
    expect(res3.status).toBe(200);
    currentApp = await ctx.prisma.application.findUnique({
      where: { id: app.id },
    });
    expect(currentApp?.stage).toBe(ApplicationStage.OFFER);

    // Stage 4 -> HIRED (Strict 200 + DB verification)
    const res4 = await agent.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.HIRED,
    });
    expect(res4.status).toBe(200);
    currentApp = await ctx.prisma.application.findUnique({
      where: { id: app.id },
    });
    expect(currentApp?.stage).toBe(ApplicationStage.HIRED);

    // Terminal Stage Boundary Verification: Transitioning from HIRED back to SCREENING must return 400
    const resInvalid = await agent.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.SCREENING,
    });
    expect(resInvalid.status).toBe(400);
    const dbAppFinal = await ctx.prisma.application.findUnique({
      where: { id: app.id },
    });
    expect(dbAppFinal?.stage).toBe(ApplicationStage.HIRED);
  });

  it("Workload 3: Full Sourcing Attribution to Hire", async () => {
    const user = await createTestUser(ctx.prisma, { role: Role.ADMIN });
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    // 1. Create a tracking link for this job
    const linkToken = `trk-${randomUUID().slice(0, 8)}`;
    const trackingLink = await ctx.prisma.trackingLink.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        name: "LinkedIn Campaign Q4",
        jobId: job.id,
        token: linkToken,
        source: SourcingChannel.LINKEDIN,
        utmSource: "linkedin",
        utmMedium: "social",
        utmCampaign: "hiring-spree",
      },
    });

    // 2. Candidate applies via public ingestion using tracking link ref
    const candidateEmail = `sourced-${Date.now()}@example.com`;
    const agent = ctx.createAgent();
    const applyRes = await agent.post("/applications/apply", {
      jobId: job.id,
      firstName: "Sourced",
      lastName: "Candidate",
      email: candidateEmail,
      ref: linkToken,
    });
    expect([200, 201]).toContain(applyRes.status);

    // 3. Verify application correctly inherited sourcing attribution
    const app = await ctx.prisma.application.findFirst({
      where: { jobId: job.id, candidate: { email: candidateEmail } },
    });
    expect(app).not.toBeNull();
    expect(app?.trackingLinkId).toBe(trackingLink.id);

    // 4. Authenticate recruiter and advance through interview to offer and hire
    const recruiterCookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie(
      "haihire_token",
      recruiterCookie.replace("haihire_token=", ""),
    );

    await agent.patch(`/applications/${app!.id}/stage`, {
      stage: ApplicationStage.INTERVIEW,
    });
    await agent.patch(`/applications/${app!.id}/stage`, {
      stage: ApplicationStage.OFFER,
    });
    const advanceRes = await agent.patch(`/applications/${app!.id}/stage`, {
      stage: ApplicationStage.HIRED,
    });
    expect(advanceRes.status).toBe(200);

    const hiredApp = await ctx.prisma.application.findUnique({
      where: { id: app!.id },
    });
    expect(hiredApp?.stage).toBe(ApplicationStage.HIRED);
  });

  it("Workload 4: Concurrent Recruiter OCC Pipeline Updates", async () => {
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

    const agent1 = ctx.createAgent();
    const cookie1 = generateTestAuthCookie(jwtService, user, org.id);
    agent1.setCookie("haihire_token", cookie1.replace("haihire_token=", ""));

    const agent2 = ctx.createAgent();
    agent2.setCookie("haihire_token", cookie1.replace("haihire_token=", ""));

    // Recruiter 1 updates to SCREENING with matching version
    const res1 = await agent1.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.SCREENING,
      version: 1,
    });
    expect(res1.status).toBe(200);

    // Recruiter 2 attempts update with stale version 1 (DB version was updated)
    const res2 = await agent2.patch(`/applications/${app.id}/stage`, {
      stage: ApplicationStage.INTERVIEW,
      version: 1, // Stale
    });
    expect(res2.status).toBe(409);
    const body2 = (await res2.json()) as { code?: string };
    expect(body2.code).toBe(APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT);
  });

  it("Workload 5: Multi-Organization Switching & Tenant Isolation Barrier", async () => {
    const user = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, user.id, {
      name: "Org Alpha",
    });
    const orgB = await createTestOrg(ctx.prisma, user.id, { name: "Org Beta" });

    const candidateA = await createTestCandidate(ctx.prisma, orgA.id, {
      firstName: "AlphaCandidate",
    });
    const candidateB = await createTestCandidate(ctx.prisma, orgB.id, {
      firstName: "BetaCandidate",
    });

    const agent = ctx.createAgent();

    // Session 1: Active in Org Alpha
    const cookieA = generateTestAuthCookie(jwtService, user, orgA.id);
    agent.setCookie("haihire_token", cookieA.replace("haihire_token=", ""));

    const resA = await agent.get(`/candidates/${candidateA.id}`);
    expect(resA.status).toBe(200);

    // Attempt to access Org Beta's candidate while in Org Alpha context
    const crossRes = await agent.get(`/candidates/${candidateB.id}`);
    expect(crossRes.status).toBe(403);

    // Session 2: Switch to Org Beta
    const cookieB = generateTestAuthCookie(jwtService, user, orgB.id);
    agent.setCookie("haihire_token", cookieB.replace("haihire_token=", ""));

    const resB = await agent.get(`/candidates/${candidateB.id}`);
    expect(resB.status).toBe(200);

    // In Org Beta context, Org Alpha's candidate is now blocked
    const crossRes2 = await agent.get(`/candidates/${candidateA.id}`);
    expect(crossRes2.status).toBe(403);
  });
});
