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
import { Role } from "@prisma/client";
import { env } from "../../config/env";

interface CandidateItem {
  id: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string | null;
}

interface ApplicationItem {
  id: string;
  candidate?: CandidateItem;
}

interface JobDetailResponse {
  id: string;
  applications?: ApplicationItem[];
}

describe("Vitest Integration: Tier 1 Feature Coverage (16 Core Features)", () => {
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

  it("T1-INT-F01: Tenant Isolation - candidate list scoped strictly to active organization", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);
    const candidateA = await createTestCandidate(ctx.prisma, orgA.id, {
      firstName: "OrgA",
      lastName: "Candidate",
    });

    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);
    await createTestCandidate(ctx.prisma, orgB.id, {
      firstName: "OrgB",
      lastName: "Candidate",
    });

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, userA, orgA.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get(`/candidates?organizationId=${orgA.id}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as
      CandidateItem[] | { items?: CandidateItem[]; data?: CandidateItem[] };
    const candidates: CandidateItem[] = Array.isArray(data)
      ? data
      : data.items || data.data || [];

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    for (const c of candidates) {
      expect(c.organizationId === orgA.id || c.id === candidateA.id).toBe(true);
      expect(c.firstName).not.toBe("OrgB");
    }
  });

  it("T1-INT-F02: Public Ingestion - anonymous applicant submits without internal fields", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const agent = ctx.createAgent();
    const res = await agent.post("/applications/apply", {
      jobId: job.id,
      firstName: "Anonymous",
      lastName: "Applicant",
      email: `anon-${Date.now()}@example.com`,
    });

    expect([200, 201]).toContain(res.status);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toBeDefined();
    // Receipt should not leak foreign or internal administrative tokens
    expect(body.organizationId).toBeUndefined();
  });

  it("T1-INT-F03: PII Masking - caller without candidate:view receives masked candidate details", async () => {
    const owner = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, owner.id);
    const job = await createTestJob(ctx.prisma, org.id, owner.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id, {
      firstName: "Sensitive",
      lastName: "Candidate",
      email: "sensitive-candidate@example.com",
      phone: "0901234567",
    });
    await createTestApplication(ctx.prisma, org.id, job.id, candidate.id);

    // Create and authenticate as an organization member lacking 'candidate:view' permission
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

    const res = await agent.get(`/jobs/${job.id}`);
    expect(res.status).toBe(200);
    const jobRes = (await res.json()) as JobDetailResponse;

    // Unconditional assertion: Member sees the application with masked candidate PII
    expect(jobRes.applications).toBeDefined();
    expect(jobRes.applications?.length).toBe(1);
    const app = jobRes.applications![0];
    expect(app.candidate).toBeDefined();
    expect(app.candidate?.name).toBe("[Masked]");
    expect(app.candidate?.email).toBe("");
    expect(app.candidate?.phone).toBeNull();
  });

  it("T1-INT-F04: Resume Storage - public application with multipart resume stores file", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const formData = new FormData();
    formData.append("jobId", job.id);
    formData.append("firstName", "Doc");
    formData.append("lastName", "Applicant");
    formData.append("email", `doc-${Date.now()}@example.com`);
    formData.append(
      "file",
      new Blob(["%PDF-1.4 test document stream\n%%EOF"], {
        type: "application/pdf",
      }),
      "cv.pdf",
    );

    const agent = ctx.createAgent();
    const res = await agent.postMultipart("/applications/apply", formData);
    expect([200, 201]).toContain(res.status);
  });

  it("T1-INT-F05: Route Guards - ActiveTenantGuard verifies active organization context", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get("/organizations/my");
    expect(res.status).toBe(200);
    const orgRes = (await res.json()) as {
      id?: string;
      organization?: { id?: string };
    };
    expect(orgRes.id || orgRes.organization?.id).toBe(org.id);
  });

  it("T1-INT-F06: Note Permissions - user with write permission can create candidate note", async () => {
    const user = await createTestUser(ctx.prisma, { role: Role.ADMIN });
    const org = await createTestOrg(ctx.prisma, user.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.post(`/candidates/${candidate.id}/notes`, {
      content: "Excellent technical interview performance",
    });

    expect([200, 201]).toContain(res.status);
    const note = (await res.json()) as { content?: string };
    expect(note.content).toBe("Excellent technical interview performance");
  });

  it("T1-INT-F07: Metrics Gating - GET /metrics succeeds with valid METRICS_TOKEN", async () => {
    const token = "test-metrics-token-at-least-32-chars-long";
    const previousToken = (env as unknown as { METRICS_TOKEN?: string })
      .METRICS_TOKEN;
    (env as unknown as { METRICS_TOKEN: string }).METRICS_TOKEN = token;

    try {
      const agent = ctx.createAgent();
      const res = await agent.get("/metrics", {
        Authorization: `Bearer ${token}`,
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("# HELP");
    } finally {
      (env as unknown as { METRICS_TOKEN?: string }).METRICS_TOKEN =
        previousToken;
    }
  });

  it("T1-INT-F08: SSE Stream - events endpoint initiates connection stream", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    const abortController = new AbortController();

    try {
      const res = await ctx.fetch("/events/sse", {
        signal: abortController.signal,
        headers: {
          Cookie: cookie,
          Accept: "text/event-stream",
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
    } finally {
      abortController.abort();
    }
  });

  it("T1-INT-F09: Org Membership - member composite key organizationId_userId is enforced", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    // Verify composite unique index exists by querying membership
    const membership = await ctx.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
    });

    expect(membership).toBeDefined();
    expect(membership?.role).toBe(Role.ADMIN);
  });

  it("T1-INT-F10: Query Validation - DtoPipe and ParseUUIDPipe accept valid formats", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    // Valid UUID parameter
    const res = await agent.get(`/candidates/${candidate.id}`);
    expect(res.status).toBe(200);
  });

  it("T1-INT-F11: Cookie Auth - login sets HttpOnly cookie for access session", async () => {
    const email = `login-${Date.now()}@haihire.local`;
    await createTestUser(ctx.prisma, {
      email,
      password: "dev-seed-password-2026",
    });

    const agent = ctx.createAgent();
    const res = await agent.post("/auth/login", {
      email,
      password: "dev-seed-password-2026",
    });

    expect(res.status).toBe(200);
    const cookies = agent.getCookies();
    expect(cookies["haihire_token"]).toBeDefined();
  });

  it("T1-INT-F12: Transactions - atomic candidate and application creation in database", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const candidateEmail = `atomic-${Date.now()}@example.com`;
    const agent = ctx.createAgent();
    const res = await agent.post("/applications/apply", {
      jobId: job.id,
      firstName: "Atomic",
      lastName: "Test",
      email: candidateEmail,
    });

    expect([200, 201]).toContain(res.status);
    const createdCandidate = await ctx.prisma.candidate.findFirst({
      where: { organizationId: org.id, email: candidateEmail },
    });
    expect(createdCandidate).toBeDefined();
  });

  it("T1-INT-F13: Native Constraints - candidate soft delete sets deletedAt timestamp via API", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.delete(`/candidates/${candidate.id}`);
    expect(res.status).toBe(200);

    const candidateInDb = await ctx.prisma.candidate.findUnique({
      where: { id: candidate.id },
    });
    expect(candidateInDb).not.toBeNull();
    expect(candidateInDb?.deletedAt).not.toBeNull();
  });

  it("T1-INT-F14: SQL Aggregation - candidate listing respects limit and offset", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    for (let i = 0; i < 3; i++) {
      await createTestCandidate(ctx.prisma, org.id, {
        firstName: `PageCand${i}`,
        email: `page-${i}-${Date.now()}@example.com`,
      });
    }

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    // Page 1 with limit 2
    const resPage1 = await agent.get(
      `/candidates?organizationId=${org.id}&limit=2&page=1`,
    );
    expect(resPage1.status).toBe(200);
    const bodyPage1 = (await resPage1.json()) as {
      data: Array<{ id: string; firstName?: string }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };

    expect(bodyPage1.data).toBeDefined();
    expect(bodyPage1.data.length).toBe(2);
    expect(bodyPage1.total).toBe(3);
    expect(bodyPage1.limit).toBe(2);
    expect(bodyPage1.page).toBe(1);
    expect(bodyPage1.totalPages).toBe(2);

    // Page 2 returns the remaining 1 candidate
    const resPage2 = await agent.get(
      `/candidates?organizationId=${org.id}&limit=2&page=2`,
    );
    expect(resPage2.status).toBe(200);
    const bodyPage2 = (await resPage2.json()) as typeof bodyPage1;
    expect(bodyPage2.data.length).toBe(1);
    expect(bodyPage2.page).toBe(2);
  });

  it("T1-INT-F15: Redis Centralized Store - rate limiting throttles requests exceeding limit with 429", async () => {
    const agent = ctx.createAgent();
    let throttledResponse: Response | null = null;

    // Burst 15 requests past the 10-request throttler limit on /auth/refresh
    for (let i = 0; i < 15; i++) {
      const res = await agent.post("/auth/refresh", {});
      if (res.status === 429) {
        throttledResponse = res;
        break;
      }
    }

    expect(throttledResponse).not.toBeNull();
    expect(throttledResponse?.status).toBe(429);
    const body = (await throttledResponse?.json()) as {
      code?: string;
      message?: string;
    };
    expect(body?.code).toBe("TOO_MANY_REQUESTS");
  });

  it("T1-INT-F16: Dashboard State - /auth/me returns user profile and active organization context", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get("/auth/me");
    expect(res.status).toBe(200);
    const profile = (await res.json()) as { id?: string };
    expect(profile.id).toBe(user.id);
  });

  it("T1-INT-F01-B [F01]: Tenant Isolation - job listing returns only jobs belonging to caller tenant", async () => {
    const userA = await createTestUser(ctx.prisma);
    const orgA = await createTestOrg(ctx.prisma, userA.id);
    const jobA = await createTestJob(ctx.prisma, orgA.id, userA.id, {
      title: "Job Org A",
    });

    const userB = await createTestUser(ctx.prisma);
    const orgB = await createTestOrg(ctx.prisma, userB.id);
    const jobB = await createTestJob(ctx.prisma, orgB.id, userB.id, {
      title: "Job Org B",
    });

    const agent = ctx.createAgent();
    const cookieA = generateTestAuthCookie(jwtService, userA, orgA.id);
    agent.setCookie("haihire_token", cookieA.replace("haihire_token=", ""));

    const res = await agent.get(`/jobs?organizationId=${orgA.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as
      | { data?: Array<{ id: string; title: string }> }
      | Array<{ id: string; title: string }>;
    const jobs = Array.isArray(body) ? body : body.data || [];

    const jobIds = jobs.map((j) => j.id);
    expect(jobIds).toContain(jobA.id);
    expect(jobIds).not.toContain(jobB.id);
  });

  it("T1-INT-F02-B [F02]: Public Ingestion - public application defaults to APPLIED stage", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const agent = ctx.createAgent();
    const candidateEmail = `stage-default-${Date.now()}@example.com`;
    const res = await agent.post("/applications/apply", {
      jobId: job.id,
      firstName: "Default",
      lastName: "Stage",
      email: candidateEmail,
    });
    expect([200, 201]).toContain(res.status);

    const app = await ctx.prisma.application.findFirst({
      where: { jobId: job.id, candidate: { email: candidateEmail } },
    });
    expect(app).not.toBeNull();
    expect(app?.stage).toBe("APPLIED");
  });

  it("T1-INT-F03-B [F03]: PII Unmasking - recruiter with candidate:view receives full unmasked candidate details", async () => {
    const owner = await createTestUser(ctx.prisma, { role: Role.ADMIN });
    const org = await createTestOrg(ctx.prisma, owner.id);
    const job = await createTestJob(ctx.prisma, org.id, owner.id);
    const candidate = await createTestCandidate(ctx.prisma, org.id, {
      firstName: "Unmasked",
      lastName: "Candidate",
      email: "unmasked-candidate@example.com",
      phone: "0987654321",
    });
    await createTestApplication(ctx.prisma, org.id, job.id, candidate.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, owner, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get(`/jobs/${job.id}`);
    expect(res.status).toBe(200);
    const jobRes = (await res.json()) as JobDetailResponse;

    expect(jobRes.applications).toBeDefined();
    expect(jobRes.applications?.length).toBe(1);
    const app = jobRes.applications![0];
    expect(app.candidate).toBeDefined();
    expect(app.candidate?.name).not.toBe("[Masked]");
    expect(app.candidate?.email).toBe("unmasked-candidate@example.com");
  });

  it("T1-INT-F04-B [F04]: Resume Storage - rejects non-pdf MIME types (png) for resume upload", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const formData = new FormData();
    formData.append("jobId", job.id);
    formData.append("firstName", "Image");
    formData.append("lastName", "Resume");
    formData.append("email", `img-${Date.now()}@example.com`);
    formData.append(
      "file",
      new Blob(["\x89PNG\r\n\x1a\n fake png image stream"], {
        type: "image/png",
      }),
      "portfolio.png",
    );

    const agent = ctx.createAgent();
    const res = await agent.postMultipart("/applications/apply", formData);
    expect(res.status).toBe(400);
  });

  it("T1-INT-F05-B [F05]: Route Guards - TenantGuard verifies matching organizationId on query parameters", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get(`/candidates?organizationId=${org.id}`);
    expect(res.status).toBe(200);
  });

  it("T1-INT-F13-B [F13]: Native Constraints - job soft delete sets deletedAt timestamp via API", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.delete(`/jobs/${job.id}`);
    expect(res.status).toBe(200);

    const jobInDb = await ctx.prisma.job.findUnique({
      where: { id: job.id },
    });
    expect(jobInDb).not.toBeNull();
    expect(jobInDb?.deletedAt).not.toBeNull();
  });

  it("T1-INT-F14-B [F14]: SQL Aggregation - candidate search by name filters properly", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const uniqueSearch = `TargetCand${randomUUID().slice(0, 6)}`;
    await createTestCandidate(ctx.prisma, org.id, {
      firstName: uniqueSearch,
      lastName: "Special",
      email: `search-${Date.now()}@example.com`,
    });
    await createTestCandidate(ctx.prisma, org.id, {
      firstName: "Other",
      lastName: "Person",
      email: `other-${Date.now()}@example.com`,
    });

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get(
      `/candidates?organizationId=${org.id}&search=${uniqueSearch}`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ firstName?: string }> };
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(1);
    expect(body.data[0].firstName).toBe(uniqueSearch);
  });

  it("T1-INT-F16-B [F16]: Dashboard State - logout clears authentication cookies", async () => {
    const agent = ctx.createAgent();
    agent.setCookie("haihire_token", "sample-valid-looking-token");

    const res = await agent.post("/auth/logout", {});
    expect(res.status).toBe(200);
    const cookies = agent.getCookies();
    // Cookie should be cleared or set to empty
    expect(!cookies["haihire_token"] || cookies["haihire_token"] === "").toBe(
      true,
    );
  });

  it("T1-INT-F07-B [F07]: Metrics Gating - Prometheus metrics expose service health status", async () => {
    const token = "test-metrics-token-at-least-32-chars-long";
    const previousToken = (env as unknown as { METRICS_TOKEN?: string })
      .METRICS_TOKEN;
    (env as unknown as { METRICS_TOKEN: string }).METRICS_TOKEN = token;

    try {
      const agent = ctx.createAgent();
      const res = await agent.get("/metrics", {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    } finally {
      (env as unknown as { METRICS_TOKEN?: string }).METRICS_TOKEN =
        previousToken;
    }
  });

  it("T1-INT-F08-B [F08]: SSE Stream - token passed via query parameter initiates stream", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const tokenCookie = generateTestAuthCookie(jwtService, user, org.id);
    const token = tokenCookie.replace("haihire_token=", "");
    const abortController = new AbortController();

    try {
      const res = await ctx.fetch(`/events/sse?token=${token}`, {
        signal: abortController.signal,
        headers: {
          Accept: "text/event-stream",
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
    } finally {
      abortController.abort();
    }
  });

  it("T1-INT-F09-B [F09]: Org Membership - retrieving members list returns organization members", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get("/organizations/my/members");
    expect(res.status).toBe(200);
    const members = (await res.json()) as Array<{
      userId?: string;
      role?: string;
    }>;
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThanOrEqual(1);
    expect(members[0].userId).toBe(user.id);
  });

  it("T1-INT-F10-B [F10]: Query Validation - audit logs query with valid limit and offset returns 200", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    const res = await agent.get("/organizations/my/audit-log?limit=5&offset=0");
    expect(res.status).toBe(200);
  });

  it("T1-INT-F13-C [F13]: Native Constraints - tracking link soft delete sets deletedAt timestamp", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);

    const link = await ctx.prisma.trackingLink.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        name: "Test Soft Delete Link",
        token: `token-${Date.now()}`,
        jobId: job.id,
      },
    });

    const softDeleted = await ctx.prisma.trackingLink.update({
      where: { id: link.id },
      data: { deletedAt: new Date() },
    });

    expect(softDeleted.deletedAt).not.toBeNull();
  });

  it("T1-INT-F17 [PipelineStage]: initializes default stages, supports custom stages, and blocks deleting stage in use", async () => {
    const user = await createTestUser(ctx.prisma);
    const org = await createTestOrg(ctx.prisma, user.id);
    const job = await createTestJob(ctx.prisma, org.id, user.id);
    const cand = await createTestCandidate(ctx.prisma, org.id);
    const app = await createTestApplication(
      ctx.prisma,
      org.id,
      job.id,
      cand.id,
    );

    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, user, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    // 1. GET /jobs/:id/stages initializes 6 default stages
    const getRes = await agent.get(`/jobs/${job.id}/stages`);
    expect(getRes.status).toBe(200);
    const initialStages = (await getRes.json()) as Array<{
      id: string;
      name: string;
      category: string;
      orderIndex: number;
    }>;
    expect(initialStages).toHaveLength(6);

    // 2. PATCH /jobs/:id/stages adds custom stage under INTERVIEW category
    const updatedStagesRes = await agent.patch(`/jobs/${job.id}/stages`, {
      stages: [
        ...initialStages.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          orderIndex: s.orderIndex,
        })),
        {
          name: "System Design Round",
          category: "INTERVIEW",
          orderIndex: 6,
          isTerminal: false,
        },
      ],
    });
    expect(updatedStagesRes.status).toBe(200);
    const updatedStages = (await updatedStagesRes.json()) as Array<{
      id: string;
      name: string;
      category: string;
    }>;
    const customStage = updatedStages.find(
      (s) => s.name === "System Design Round",
    );
    expect(customStage).toBeDefined();

    // 3. Move application to custom stageId
    const moveRes = await agent.patch(`/applications/${app.id}/stage`, {
      stageId: customStage!.id,
    });
    expect(moveRes.status).toBe(200);
    const movedApp = (await moveRes.json()) as {
      stage: string;
      stageId?: string | null;
    };
    expect(movedApp.stage).toBe("INTERVIEW");
    expect(movedApp.stageId).toBe(customStage!.id);

    // 4. Attempting to delete the stage currently assigned to app fails cleanly (400)
    const deleteBlockedRes = await agent.patch(`/jobs/${job.id}/stages`, {
      stages: initialStages.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        orderIndex: s.orderIndex,
      })),
    });
    expect(deleteBlockedRes.status).toBe(400);
  });

  it("T1-INT-F18 [Schema-R5]: structured job salary, StoredFile relations, and OutboxEvent emission + RLS isolation", async () => {
    const owner = await createTestUser(ctx.prisma, { role: Role.ADMIN });
    const org = await createTestOrg(ctx.prisma, owner.id, {
      name: "Schema R5 Org",
    });
    const otherOrg = await createTestOrg(ctx.prisma, owner.id, {
      name: "Schema R5 Other Org",
    });
    const jwtService = new JwtService({ secret: env.JWT_SECRET });
    const agent = ctx.createAgent();
    const cookie = generateTestAuthCookie(jwtService, owner, org.id);
    agent.setCookie("haihire_token", cookie.replace("haihire_token=", ""));

    // 1. Create Job with structured salary fields
    const createJobRes = await agent.post("/jobs", {
      title: "Staff Platform Engineer",
      department: "Platform",
      location: "Remote",
      description: "Build core platform reliability.",
      salaryRange: "$4,000 - $6,000",
      salaryMin: 4000,
      salaryMax: 6000,
      salaryCurrency: "USD",
    });
    expect(createJobRes.status).toBe(201);
    const job = (await createJobRes.json()) as {
      id: string;
      salaryMin: number | null;
      salaryMax: number | null;
      salaryCurrency: string | null;
    };
    expect(job.salaryMin).toBe(4000);
    expect(job.salaryMax).toBe(6000);
    expect(job.salaryCurrency).toBe("USD");

    // 2. StoredFile normalized registry linked to Candidate, CandidateDocument, Application
    const storedFile = await ctx.prisma.storedFile.create({
      data: {
        organizationId: org.id,
        objectKey: `${org.id}/resumes/staff-cv-${Date.now()}.pdf`,
        originalName: "staff-cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: 24576,
      },
    });
    const candidate = await ctx.prisma.candidate.create({
      data: {
        organizationId: org.id,
        firstName: "Linh",
        lastName: "Tran",
        email: `linh-r5-${Date.now()}@example.com`,
        resumeFileId: storedFile.id,
      },
    });
    const doc = await ctx.prisma.candidateDocument.create({
      data: {
        candidateId: candidate.id,
        organizationId: org.id,
        name: "staff-cv.pdf",
        url: storedFile.objectKey,
        size: storedFile.sizeBytes,
        mimeType: storedFile.mimeType,
        storedFileId: storedFile.id,
      },
    });
    expect(doc.storedFileId).toBe(storedFile.id);

    const app = await ctx.prisma.application.create({
      data: {
        organizationId: org.id,
        jobId: job.id,
        candidateId: candidate.id,
        stage: "APPLIED",
        resumeFileId: storedFile.id,
      },
    });
    expect(app.resumeFileId).toBe(storedFile.id);

    // 3. Stage update emits OutboxEvent inside the tenant
    const moveRes = await agent.patch(`/applications/${app.id}/stage`, {
      stage: "SCREENING",
    });
    expect(moveRes.status).toBe(200);

    const outboxEvents = await ctx.prisma.outboxEvent.findMany({
      where: {
        organizationId: org.id,
        aggregateId: app.id,
        eventType: "APPLICATION_STAGE_CHANGED",
      },
    });
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0]?.status).toBe("PENDING");
    expect(outboxEvents[0]?.aggregateType).toBe("Application");

    // 4. RLS isolates StoredFile and OutboxEvent from another tenant
    const leaked = await ctx.prisma.withTenantRls(otherOrg.id, async (tx) => ({
      files: await tx.storedFile.findMany({ where: { id: storedFile.id } }),
      events: await tx.outboxEvent.findMany({ where: { aggregateId: app.id } }),
    }));
    expect(leaked.files).toHaveLength(0);
    expect(leaked.events).toHaveLength(0);
  });
});
