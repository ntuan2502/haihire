import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { AuthService } from "../auth/auth.service";
import { JobsService } from "../jobs/jobs.service";
import { ApplicationsService } from "../applications/applications.service";
import { CandidatesService } from "../candidates/candidates.service";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../auth/constants";

describe("ATS End-to-End Core Lifecycle Flow (E2E Integration)", () => {
  let authService: AuthService;
  let jobsService: JobsService;
  let applicationsService: ApplicationsService;
  let candidatesService: CandidatesService;

  // In-memory mock database state simulating PostgreSQL
  interface MockDbState {
    users: Array<Record<string, unknown>>;
    orgs: Array<Record<string, unknown>>;
    jobs: Array<Record<string, unknown>>;
    candidates: Array<Record<string, unknown>>;
    applications: Array<Record<string, unknown>>;
    activities: Array<Record<string, unknown>>;
    documents: Array<Record<string, unknown>>;
  }

  let dbState: MockDbState;

  beforeEach(() => {
    const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, 10);
    dbState = {
      users: [
        {
          id: "usr-admin-1",
          email: DEMO_ACCOUNTS.ADMIN.email,
          name: DEMO_ACCOUNTS.ADMIN.name,
          password: hashedPassword,
          role: "ADMIN",
          avatarUrl: null,
          organizationId: "org-test-1",
          createdAt: new Date(),
        },
      ],
      orgs: [
        {
          id: "org-test-1",
          name: "Acme Corp",
          slug: "acme-corp",
          ownerId: "usr-admin-1",
          createdAt: new Date(),
        },
      ],
      jobs: [],
      candidates: [],
      applications: [],
      activities: [],
      documents: [],
    };

    const mockPrisma = {
      db: {
        orm: {
          public: {
            User: {
              select: vi.fn().mockImplementation((..._fields: string[]) => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  first: vi.fn().mockImplementation(async () => {
                    return (
                      dbState.users.find((u) =>
                        predicateFn({
                          email: { eq: (target: string) => u.email === target },
                          id: { eq: (target: string) => u.id === target },
                        }),
                      ) || null
                    );
                  }),
                })),
              })),
            },
            Organization: {
              select: vi.fn().mockImplementation((..._fields: string[]) => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  first: vi.fn().mockImplementation(async () => {
                    return (
                      dbState.orgs.find((o) =>
                        predicateFn({
                          id: { eq: (target: string) => o.id === target },
                          slug: { eq: (target: string) => o.slug === target },
                        }),
                      ) || null
                    );
                  }),
                })),
                all: vi.fn().mockImplementation(async () => dbState.orgs),
              })),
            },
            Job: {
              create: vi.fn().mockImplementation(async (record) => {
                const newJob = { id: `job-${Date.now()}`, ...record, createdAt: new Date() };
                dbState.jobs.push(newJob);
                return newJob;
              }),
              upsert: vi.fn().mockImplementation(async ({ create }) => {
                const newJob = { id: `job-${Date.now()}`, ...create, createdAt: new Date() };
                dbState.jobs.push(newJob);
                return newJob;
              }),
              select: vi.fn().mockImplementation((..._fields: string[]) => ({
                all: vi.fn().mockImplementation(async () => dbState.jobs),
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return dbState.jobs.filter((j) =>
                      predicateFn({
                        organizationId: { eq: (target: string) => j.organizationId === target },
                        id: {
                          eq: (target: string) => j.id === target,
                          in: (arr: string[]) => arr.includes(j.id as string),
                        },
                      }),
                    );
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    return (
                      dbState.jobs.find((j) =>
                        predicateFn({
                          id: {
                            eq: (target: string) => j.id === target,
                            in: (arr: string[]) => arr.includes(j.id as string),
                          },
                        }),
                      ) || null
                    );
                  }),
                })),
              })),
            },
            Candidate: {
              create: vi.fn().mockImplementation(async (record) => {
                const newCandidate = {
                  id: `cand-${Date.now()}`,
                  ...record,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                dbState.candidates.push(newCandidate);
                return newCandidate;
              }),
              select: vi.fn().mockImplementation((..._fields: string[]) => {
                const createCandidateQuery = (
                  predicates: Array<(c: Record<string, unknown>) => boolean> = [],
                ) => ({
                  where: vi.fn().mockImplementation((predicateFn) => {
                    return createCandidateQuery([
                      ...predicates,
                      (c) =>
                        predicateFn({
                          organizationId: { eq: (target: string) => c.organizationId === target },
                          id: { eq: (target: string) => c.id === target },
                          email: { eq: (target: string) => c.email === target },
                        }),
                    ]);
                  }),
                  all: vi.fn().mockImplementation(async () => {
                    return dbState.candidates.filter((c) => predicates.every((p) => p(c)));
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    return (
                      dbState.candidates.find((c) => predicates.every((p) => p(c))) || null
                    );
                  }),
                });
                return createCandidateQuery();
              }),
              where: vi.fn().mockImplementation((predicateFn) => ({
                delete: vi.fn().mockImplementation(async () => {
                  const idx = dbState.candidates.findIndex((c) =>
                    predicateFn({ id: { eq: (target: string) => c.id === target } }),
                  );
                  if (idx !== -1) {
                    const deleted = dbState.candidates.splice(idx, 1)[0];
                    // Simulate Database ON DELETE CASCADE
                    dbState.applications = dbState.applications.filter(
                      (a) => a.candidateId !== deleted.id,
                    );
                    dbState.documents = dbState.documents.filter(
                      (d) => d.candidateId !== deleted.id,
                    );
                  }
                  return { count: 1 };
                }),
              })),
            },
            CandidateDocument: {
              where: vi.fn().mockImplementation((predicateFn) => ({
                delete: vi.fn().mockImplementation(async () => {
                  dbState.documents = dbState.documents.filter(
                    (d) =>
                      !predicateFn({
                        candidateId: { eq: (target: string) => d.candidateId === target },
                        id: { eq: (target: string) => d.id === target },
                        url: { eq: (target: string) => d.url === target },
                      }),
                  );
                  return { count: 1 };
                }),
              })),
            },
            Application: {
              create: vi.fn().mockImplementation(async (record) => {
                const newApp = {
                  id: `app-${Date.now()}`,
                  ...record,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                dbState.applications.push(newApp);
                return newApp;
              }),
              select: vi.fn().mockImplementation((..._fields: string[]) => {
                const createApplicationQuery = (
                  predicates: Array<(a: Record<string, unknown>) => boolean> = [],
                ) => ({
                  where: vi.fn().mockImplementation((predicateFn) => {
                    return createApplicationQuery([
                      ...predicates,
                      (a) =>
                        predicateFn({
                          candidateId: {
                            eq: (target: string) => a.candidateId === target,
                            in: (arr: string[]) => arr.includes(a.candidateId as string),
                          },
                          jobId: {
                            eq: (target: string) => a.jobId === target,
                            in: (arr: string[]) => arr.includes(a.jobId as string),
                          },
                          id: { eq: (target: string) => a.id === target },
                        }),
                    ]);
                  }),
                  all: vi.fn().mockImplementation(async () => {
                    return dbState.applications.filter((a) => predicates.every((p) => p(a)));
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    return (
                      dbState.applications.find((a) => predicates.every((p) => p(a))) || null
                    );
                  }),
                });
                return createApplicationQuery();
              }),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const target = dbState.applications.find((a) =>
                    predicateFn({ id: { eq: (target: string) => a.id === target } }),
                  );
                  if (target) {
                    Object.assign(target, updates);
                    return { ...target };
                  }
                  return null;
                }),
                delete: vi.fn().mockImplementation(async () => {
                  const idx = dbState.applications.findIndex((a) =>
                    predicateFn({ id: { eq: (target: string) => a.id === target } }),
                  );
                  if (idx !== -1) dbState.applications.splice(idx, 1);
                  return { count: 1 };
                }),
              })),
            },
            ActivityLog: {
              create: vi.fn().mockImplementation(async (record) => {
                const newActivity = { id: `act-${Date.now()}`, ...record, createdAt: new Date() };
                dbState.activities.push(newActivity);
                return newActivity;
              }),
            },
            Interview: {
              where: vi.fn().mockImplementation(() => ({
                all: vi.fn().mockResolvedValue([]),
              })),
            },
          },
        },
      },
    };

    const mockJwtService = {
      sign: vi.fn().mockReturnValue("mock-valid-jwt-token-12345"),
    };

    const mockMinioService = {
      uploadFile: vi.fn().mockResolvedValue({
        url: "http://localhost:9000/haihire-resumes/resume.pdf",
        fileName: "resume.pdf",
        originalName: "resume.pdf",
        size: 1024,
        mimeType: "application/pdf",
      }),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    const mockActivitiesService = {
      createActivity: vi.fn().mockImplementation(async (record) => {
        dbState.activities.push({ id: `act-${Date.now()}`, ...record, createdAt: new Date() });
        return record;
      }),
    };
    const mockEmailService = {
      queueEmail: vi.fn().mockResolvedValue(true),
      sendEmail: vi.fn().mockResolvedValue(true),
      getTemplateByType: vi.fn().mockResolvedValue(null),
    };

    authService = new AuthService(mockPrisma as never, mockJwtService as never);
    jobsService = new JobsService(mockPrisma as never);
    candidatesService = new CandidatesService(mockPrisma as never, mockMinioService as never);
    applicationsService = new ApplicationsService(
      mockPrisma as never,
      mockMinioService as never,
      mockActivitiesService as never,
      mockEmailService as never,
    );
  });

  it("should complete the full lifecycle: Auth -> Create Job -> Apply -> Kanban Stage -> Cascade Delete", async () => {
    // 1. Authentication Step
    const loginResult = await authService.login({
      email: DEMO_ACCOUNTS.ADMIN.email,
      password: DEMO_PASSWORD,
    });
    expect(loginResult).toBeDefined();
    expect(loginResult.accessToken).toBe("mock-valid-jwt-token-12345");
    expect(loginResult.user.organizationId).toBe("org-test-1");

    // 2. Job Creation Step
    const createdJob = await jobsService.create(
      {
        title: "Senior Full-Stack Engineer (E2E)",
        department: "Engineering",
        location: "Hanoi, Vietnam",
        type: "FULL_TIME",
        description: "Leading frontend and backend development in TypeScript.",
        status: "PUBLISHED",
        organizationId: "org-test-1",
      });
    expect(createdJob).toBeDefined();
    expect(createdJob.title).toBe("Senior Full-Stack Engineer (E2E)");
    expect(dbState.jobs.length).toBe(1);

    // 3. Candidate & Application Step
    const createdCandidate = await candidatesService.create(
      {
        name: "Nguyen Van A",
        email: "nguyenvana@example.com",
        phone: "+84901234567",
        notes: "Docs:[{\"id\":\"doc-1\",\"name\":\"cv.pdf\",\"url\":\"http://localhost:9000/haihire-resumes/cv.pdf\"}]",
      },
      undefined,
      "org-test-1",
    );
    expect(createdCandidate).toBeDefined();
    expect(createdCandidate.name).toBe("Nguyen Van A");

    const createdApp = await applicationsService.create({
      candidateId: createdCandidate.id,
      jobId: createdJob.id,
      notes: "Direct application via portal",
    });
    expect(createdApp).toBeDefined();
    expect(createdApp.stage).toBe("APPLIED");
    expect(dbState.applications.length).toBe(1);

    // 4. Test Server-Side Pagination on Candidates API
    const pagedCandidates = await candidatesService.findAll("org-test-1", {
      page: 1,
      limit: 10,
      search: "Nguyen",
    });
    expect(pagedCandidates.total).toBe(1);
    expect(pagedCandidates.page).toBe(1);
    expect(pagedCandidates.limit).toBe(10);
    expect(pagedCandidates.totalPages).toBe(1);
    expect(pagedCandidates.data.length).toBe(1);
    expect(pagedCandidates.data[0].name).toBe("Nguyen Van A");

    // 5. Kanban Stage Transition (Move from APPLIED to INTERVIEW)
    const updatedApp = await applicationsService.updateStage(
      createdApp.id,
      { stage: "INTERVIEW", orderIndex: 1 },
    );
    expect(updatedApp.stage).toBe("INTERVIEW");

    // 6. Verify Cascade Deletion of Candidate & Relations
    const deleteResult = await candidatesService.remove(createdCandidate.id);
    expect(deleteResult.success).toBe(true);

    // Verify candidate and associated application were removed
    expect(dbState.candidates.length).toBe(0);
    expect(dbState.applications.length).toBe(0);
  });
});
