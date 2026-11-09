import { createTestApplicationsService } from "./helpers/service-factories";
import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createMockPrismaService } from "./helpers/prisma-composer-mock";
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

    const mockPrisma = createMockPrismaService({
      user: dbState.users,
      organization: dbState.orgs,
      organizationMember: [],
      job: dbState.jobs,
      candidate: dbState.candidates,
      application: dbState.applications,
      candidateDocument: dbState.documents,
      activityLog: dbState.activities,
      interview: [],
    });

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
        dbState.activities.push({
          id: `act-${Date.now()}`,
          ...record,
          createdAt: new Date(),
        });
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
    candidatesService = new CandidatesService(
      mockPrisma as never,
      mockMinioService as never,
    );
    applicationsService = createTestApplicationsService(
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
    const createdJob = await jobsService.create({
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
        notes: "Senior TypeScript engineer with strong backend experience",
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
    const updatedApp = await applicationsService.updateStage(createdApp.id, {
      stage: "INTERVIEW",
      orderIndex: 1,
    });
    expect(updatedApp.stage).toBe("INTERVIEW");

    // 6. Verify Soft Deletion of Candidate (Two-Tier Deletion Protocol)
    const deleteResult = await candidatesService.remove(createdCandidate.id);
    expect(deleteResult.success).toBe(true);

    // Verify candidate is marked with deletedAt and excluded from active listing
    const candidateInDb = dbState.candidates.find(
      (c) => c.id === createdCandidate.id,
    );
    expect(candidateInDb?.deletedAt).toBeDefined();

    const pagedAfterDelete = await candidatesService.findAll("org-1", {
      limit: 10,
    });
    expect(pagedAfterDelete.data.length).toBe(0);
  });
});
