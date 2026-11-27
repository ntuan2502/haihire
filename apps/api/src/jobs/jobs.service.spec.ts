import {
  createMockTable,
  createMockPrismaService,
} from "../test/helpers/prisma-composer-mock";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { JobsService } from "./jobs.service";
import { JobsController } from "./jobs.controller";
import { NotFoundException } from "@nestjs/common";
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  ExperienceLevel,
  JobStatus,
  JobType,
  WorkplaceType,
  updateJobSchema,
} from "@haihire/shared";

describe("JobsService - Multi-Tenant Job Management", () => {
  let service: JobsService;
  let mockPrismaService: unknown;

  interface MockJob {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    description: string;
    applicationDeadline?: Date | null;
    startDate?: Date | null;
    openings?: number;
    salaryRange: string;
    status: string;
    organizationId: string;
    createdById?: string | null;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
  }

  interface MockApp {
    id: string;
    jobId: string;
    candidateId?: string;
    stage: string;
  }

  let mockJobs: MockJob[] = [];
  let mockApps: MockApp[] = [];

  beforeEach(() => {
    mockJobs = [
      {
        id: "job-1",
        title: "Senior Full-Stack Engineer",
        department: "Engineering",
        location: "Hanoi / Remote",
        type: "FULL_TIME",
        description: "Develop scalable apps\n\n5+ years TS/React",
        salaryRange: "$2,500 - $4,000",
        status: "PUBLISHED",
        organizationId: "org-1",
        createdById: "usr-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "job-2",
        title: "Product Designer",
        department: "Design",
        location: "Remote",
        type: "FULL_TIME",
        description: "Design UI/UX\n\nFigma expert",
        salaryRange: "$2,000 - $3,000",
        status: "DRAFT",
        organizationId: "org-1",
        createdById: "usr-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "job-3",
        title: "Marketing Lead (Competitor Org)",
        department: "Marketing",
        location: "HCM City",
        type: "FULL_TIME",
        description: "Grow brand awareness\n\nSEO / Ads",
        salaryRange: "$2,000 - $3,500",
        status: "PUBLISHED",
        organizationId: "org-2", // Different organization!
        createdById: "usr-2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockApps = [
      {
        id: "app-1",
        jobId: "job-1",
        stage: "APPLIED",
      },
      {
        id: "app-2",
        jobId: "job-1",
        stage: "INTERVIEW",
      },
      {
        id: "app-3",
        jobId: "job-3", // App for org-2's job
        stage: "APPLIED",
      },
    ];

    const jobTable = createMockTable(mockJobs);
    const appTable = createMockTable(mockApps);
    const orgTable = createMockTable([
      { id: "org-1", name: "Acme Corp", slug: "acme-corp" },
      { id: "org-2", name: "Beta Corp", slug: "beta-corp" },
    ]);
    const candidateTable = createMockTable();
    const interviewTable = createMockTable();

    mockPrismaService = createMockPrismaService({
      job: jobTable,
      application: appTable,
      organization: orgTable,
      candidate: candidateTable,
      interview: interviewTable,
    });
    service = new JobsService(mockPrismaService as never);
  });

  describe("Multi-Tenant Isolation", () => {
    it("should return only jobs belonging to org-1 when filtered by org-1", async () => {
      const results = await service.listPaginated({
        organizationId: "org-1",
        tenantOrgId: "org-1",
      });

      expect(results.total).toBe(2);
      expect(results.data.length).toBe(2);
      expect(results.data.every((j) => j.organizationId === "org-1")).toBe(
        true,
      );
      expect(results.data.some((j) => j.title.includes("Competitor Org"))).toBe(
        false,
      );
    });

    it("should return only jobs belonging to org-2 when filtered by org-2", async () => {
      const results = await service.listPaginated({
        organizationId: "org-2",
        tenantOrgId: "org-2",
      });

      expect(results.total).toBe(1);
      expect(results.data.length).toBe(1);
      expect(results.data[0].title).toBe("Marketing Lead (Competitor Org)");
      expect(results.data[0].organizationId).toBe("org-2");
    });

    it("should compute application metrics correctly per job", async () => {
      const results = await service.listPaginated({ tenantOrgId: "org-1" });
      const job1 = results.data.find((j) => j.id === "job-1");

      expect(job1?.applicationsCount).toBe(2);
      expect(job1?.applicationsByStage.APPLIED).toBe(1);
      expect(job1?.applicationsByStage.INTERVIEW).toBe(1);
    });

    it("should paginate jobs correctly", async () => {
      const paged = await service.listPaginated({
        tenantOrgId: "org-1",
        page: 1,
        limit: 1,
      });

      expect(paged.total).toBe(2);
      expect(paged.page).toBe(1);
      expect(paged.limit).toBe(1);
      expect(paged.totalPages).toBe(2);
      expect(paged.data.length).toBe(1);
    });
  });

  describe("Filtering & Searching", () => {
    it("should filter by status", async () => {
      const published = await service.listPaginated({
        tenantOrgId: "org-1",
        status: "PUBLISHED",
      });
      expect(published.total).toBe(1);
      expect(published.data.length).toBe(1);
      expect(published.data[0].id).toBe("job-1");

      const drafts = await service.listPaginated({
        tenantOrgId: "org-1",
        status: "DRAFT",
      });
      expect(drafts.total).toBe(1);
      expect(drafts.data.length).toBe(1);
      expect(drafts.data[0].id).toBe("job-2");
    });

    it("should search jobs by keyword", async () => {
      const searchResults = await service.listPaginated({
        tenantOrgId: "org-1",
        search: "Full-Stack",
      });
      expect(searchResults.total).toBe(1);
      expect(searchResults.data.length).toBe(1);
      expect(searchResults.data[0].title).toBe("Senior Full-Stack Engineer");
    });
  });

  describe("CRUD operations", () => {
    it("should find one job by id", async () => {
      const job = await service.findOne("job-1");
      expect(job).toBeDefined();
      expect(job.title).toBe("Senior Full-Stack Engineer");
      expect(job.applicationsCount).toBe(2);
    });

    it("should throw NotFoundException if job not found", async () => {
      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should create a new job linked to organization", async () => {
      const created = await service.create({
        title: "QA Lead",
        department: "Engineering",
        location: "Remote",
        type: JobType.FULL_TIME,
        description: "Testing systems",
        status: JobStatus.PUBLISHED,
        organizationId: "org-1",
      });

      expect(created.title).toBe("QA Lead");
      expect(created.organizationId).toBe("org-1");
    });

    it("should update an existing job", async () => {
      const updated = await service.update("job-1", {
        title: "Lead Full-Stack Engineer",
        status: JobStatus.CLOSED,
      });

      expect(updated?.title).toBe("Lead Full-Stack Engineer");
      expect(updated?.status).toBe(JobStatus.CLOSED);
    });

    it("should reject creating a job for another organization", async () => {
      await expect(
        service.create(
          {
            title: "Hacker Job",
            department: "Engineering",
            location: "Remote",
            type: JobType.FULL_TIME,
            description: "Unauthorized",
            status: JobStatus.PUBLISHED,
            organizationId: "org-2",
          },
          "org-1",
        ),
      ).rejects.toThrow();
    });

    it("should reject updating a job belonging to another organization", async () => {
      await expect(
        service.update("job-1", { title: "Hacked" }, "org-2"),
      ).rejects.toThrow();
    });

    it("should reject removing a job belonging to another organization", async () => {
      await expect(service.remove("job-1", "org-2")).rejects.toThrow();
    });

    it("should remove a job", async () => {
      const result = await service.remove("job-1", "org-1");
      expect(result.success).toBe(true);
      await expect(service.findOne("job-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("Public Career Page Visibility", () => {
    beforeEach(() => {
      // Add CLOSED and ARCHIVED jobs to test complete lifecycle isolation
      mockJobs.push(
        {
          id: "job-closed",
          title: "Closed Position",
          department: "Engineering",
          location: "Remote",
          type: "FULL_TIME",
          description: "Closed",
          salaryRange: "$1000",
          status: "CLOSED",
          organizationId: "org-1",
          createdAt: new Date(),
        },
        {
          id: "job-archived",
          title: "Archived Position",
          department: "Engineering",
          location: "Remote",
          type: "FULL_TIME",
          description: "Archived",
          salaryRange: "$1000",
          status: "ARCHIVED",
          organizationId: "org-1",
          createdAt: new Date(),
        },
      );
    });

    it("limits an authenticated account without an active organization to public jobs", async () => {
      const controller = new JobsController(service);
      const request = { user: { organizationId: null } };

      const results = await controller.listPaginated(request);
      expect(results.data.map((job) => job.status)).toEqual([
        "PUBLISHED",
        "PUBLISHED",
      ]);
      expect(results.data.map((job) => job.applicationsCount)).toEqual([0, 0]);
      await expect(controller.findOne("job-2", request)).rejects.toThrow(
        NotFoundException,
      );
      const published = await controller.findOne("job-1", request);
      expect(published.applications).toEqual([]);
    });

    it("applies public visibility when an authenticated user lists another organization's jobs", async () => {
      const results = await service.listPaginated({
        organizationSlug: "acme-corp",
        tenantOrgId: "org-2",
      });

      expect(results.data.map((job) => job.id)).toEqual(["job-1"]);
    });

    it("should return ONLY PUBLISHED jobs for unauthenticated career page requests", async () => {
      const results = await service.listPaginated({
        organizationSlug: "acme-corp",
      });

      // job-1 is PUBLISHED; job-2 is DRAFT; job-closed is CLOSED; job-archived is ARCHIVED
      expect(results.total).toBe(1);
      expect(results.data.length).toBe(1);
      expect(results.data[0].id).toBe("job-1");
      expect(results.data[0].status).toBe("PUBLISHED");
    });

    it("should reject exposing DRAFT/CLOSED jobs even if unauthenticated user requests status query param", async () => {
      const draftReq = await service.listPaginated({
        organizationSlug: "acme-corp",
        status: "DRAFT",
      });
      // Should not return draft jobs
      expect(draftReq.data.some((j) => j.status === "DRAFT")).toBe(false);

      const closedReq = await service.listPaginated({
        organizationSlug: "acme-corp",
        status: "CLOSED",
      });
      expect(
        closedReq.data.some(
          (j) => j.status === "CLOSED" || j.status === "ARCHIVED",
        ),
      ).toBe(false);
    });

    it("should throw NotFoundException when public user tries to access a DRAFT job via findBySlug", async () => {
      await expect(service.findBySlug("acme-corp", "job-2")).rejects.toThrow();
    });

    it("should allow public access to a CLOSED job via findBySlug without leaking applicant data", async () => {
      const job = await service.findBySlug("acme-corp", "job-closed");
      expect(job).toBeDefined();
      expect(job.status).toBe("CLOSED");
      expect(job.applications).toEqual([]);
      expect(job.applicationsCount).toBe(0);
    });

    it("should not leak applicant applications data to public career viewers", async () => {
      const job = await service.findBySlug("acme-corp", "job-1");
      expect(job).toBeDefined();
      expect(job.applications).toEqual([]);
      expect(job.applicationsCount).toBe(0);
    });

    it("BUG-12 & BUG-14: findAll sorts by applicants count and findBySlug prefers PUBLISHED over CLOSED with same title", async () => {
      const desc = await service.listPaginated({
        tenantOrgId: "org-1",
        sortBy: "applicants",
        sortOrder: "desc",
      });
      expect(desc.data[0]?.id).toBe("job-1");
      expect(desc.data[0]?.applicationsCount).toBe(2);

      const asc = await service.listPaginated({
        tenantOrgId: "org-1",
        sortBy: "applicants",
        sortOrder: "asc",
      });
      expect(asc.data[0]?.applicationsCount).toBe(0);
      expect(asc.data[asc.data.length - 1]?.id).toBe("job-1");

      mockJobs.push(
        {
          id: "job-closed-dup",
          title: "Frontend Engineer",
          department: "Engineering",
          location: "HCM",
          type: "FULL_TIME",
          description: "Old closed opening",
          salaryRange: "$2,000 - $3,000",
          status: "CLOSED",
          organizationId: "org-1",
          createdById: "usr-1",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
        {
          id: "job-pub-dup",
          title: "Frontend Engineer",
          department: "Engineering",
          location: "Hanoi",
          type: "FULL_TIME",
          description: "New published opening",
          salaryRange: "$2,000 - $3,000",
          status: "PUBLISHED",
          organizationId: "org-1",
          createdById: "usr-1",
          createdAt: new Date("2026-02-01T00:00:00Z"),
          updatedAt: new Date("2026-02-01T00:00:00Z"),
        },
      );

      const matched = await service.findBySlug(
        "acme-corp",
        "frontend-engineer",
      );
      expect(matched.id).toBe("job-pub-dup");
      expect(matched.status).toBe("PUBLISHED");
    });

    it("BUG-27: updatePipelineStages syncs Application.stage on category change and rejects foreign stage IDs", async () => {
      const stagesTable = createMockTable([
        {
          id: "stg-1",
          organizationId: "org-1",
          jobId: "job-1",
          name: "Tech Screen",
          category: "SCREENING",
          orderIndex: 1,
          color: null,
          isTerminal: false,
          version: 1,
          createdAt: new Date(),
        },
        {
          id: "stg-other-job",
          organizationId: "org-2",
          jobId: "job-other",
          name: "Foreign Stage",
          category: "APPLIED",
          orderIndex: 1,
          color: null,
          isTerminal: false,
          version: 1,
          createdAt: new Date(),
        },
      ]);
      const localApps = createMockTable([
        {
          id: "app-sync-1",
          organizationId: "org-1",
          jobId: "job-1",
          stageId: "stg-1",
          stage: "SCREENING",
        },
      ]);
      const localPrisma = createMockPrismaService({
        job: createMockTable([
          {
            id: "job-1",
            title: "Engineer",
            department: "Eng",
            location: "Remote",
            type: "FULL_TIME",
            status: "PUBLISHED",
            organizationId: "org-1",
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        application: localApps,
        pipelineStage: stagesTable,
      });
      const localService = new JobsService(localPrisma as never);

      await localService.updatePipelineStages(
        "job-1",
        {
          stages: [
            {
              id: "stg-1",
              name: "Tech Interview",
              category: "INTERVIEW",
              orderIndex: 1,
            },
          ],
        },
        "org-1",
      );

      expect(localApps.store[0].stage).toBe("INTERVIEW");

      await expect(
        localService.updatePipelineStages(
          "job-1",
          {
            stages: [
              {
                id: "stg-1",
                name: "Tech Interview",
                category: "INTERVIEW",
                orderIndex: 1,
              },
              {
                id: "stg-other-job",
                name: "Hijack",
                category: "APPLIED",
                orderIndex: 2,
              },
            ],
          },
          "org-1",
        ),
      ).rejects.toThrow(/another job/i);
    });

    it("creates and updates jobs with schedule/headcount fields, expanded enums, and sanitized rich-text descriptions", async () => {
      const created = await service.create(
        {
          title: "Field Operations Manager",
          department: "Operations",
          location: "Da Nang",
          type: JobType.FREELANCE,
          experienceLevel: ExperienceLevel.MANAGER,
          workplace: WorkplaceType.FIELD,
          applicationDeadline: "2026-12-31",
          startDate: "2027-01-15",
          openings: 4,
          description:
            '<h2 style="color:red">Role</h2><p>Lead field ops<script>alert(1)</script></p>',
          status: JobStatus.PUBLISHED,
          organizationId: "org-1",
        },
        "org-1",
      );

      expect(created.type).toBe(JobType.FREELANCE);
      expect(created.experienceLevel).toBe(ExperienceLevel.MANAGER);
      expect(created.workplace).toBe(WorkplaceType.FIELD);
      expect(created.openings).toBe(4);
      expect((created.applicationDeadline as Date).toISOString()).toBe(
        "2026-12-31T00:00:00.000Z",
      );
      expect((created.startDate as Date).toISOString()).toBe(
        "2027-01-15T00:00:00.000Z",
      );
      expect(created.description).toBe("<h2>Role</h2><p>Lead field ops</p>");

      const updated = await service.update(
        created.id,
        {
          openings: 6,
          applicationDeadline: null,
          description: "<p>Updated <strong>scope</strong></p>",
        },
        "org-1",
      );
      expect(updated.openings).toBe(6);
      expect(updated.applicationDeadline).toBeNull();
      expect(updated.description).toBe("<p>Updated <strong>scope</strong></p>");

      await expect(
        service.create(
          {
            title: "Empty JD",
            department: "Operations",
            location: "Hanoi",
            description: "<p>   </p><script>alert(1)</script>",
            organizationId: "org-1",
          },
          "org-1",
        ),
      ).rejects.toThrow("Job description is required");

      await expect(
        service.create(
          {
            title: "Invalid Date Job",
            department: "Operations",
            location: "Hanoi",
            description: "<p>Valid description</p>",
            applicationDeadline: "2026-02-31",
            organizationId: "org-1",
          },
          "org-1",
        ),
      ).rejects.toThrow("Invalid calendar date");
    });

    it("accepts null optional fields in updateJobSchema when editing and clearing values", () => {
      const parsed = updateJobSchema.safeParse({
        title: "Senior Full-Stack Engineer",
        department: "Engineering",
        location: "Ho Chi Minh City",
        postalCode: null,
        experienceLevel: null,
        workplace: null,
        type: JobType.FULL_TIME,
        applicationDeadline: null,
        startDate: null,
        openings: 1,
        description: "<p>Updated description</p>",
        salaryRange: null,
        status: JobStatus.PUBLISHED,
      });

      expect(parsed.success).toBe(true);
    });

    it("records event-envelope audit logs on job create, status change, update, and remove", async () => {
      const mockAuditLog = {
        logOrg: vi.fn().mockResolvedValue({}),
      };
      const auditedService = new JobsService(
        mockPrismaService as never,
        undefined,
        mockAuditLog as never,
      );

      const created = await auditedService.create(
        {
          title: "Platform Architect",
          department: "Engineering",
          location: "Hanoi",
          description: "<p>Lead platform scale</p>",
          organizationId: "org-1",
        },
        "org-1",
        "usr-1",
      );

      expect(mockAuditLog.logOrg).toHaveBeenCalledWith(
        "org-1",
        "usr-1",
        AUDIT_ACTIONS.JOB_CREATED,
        AUDIT_RESOURCES.JOB,
        expect.objectContaining({
          department: "Engineering",
          status: "PUBLISHED",
        }),
        undefined,
        expect.objectContaining({
          targetId: created.id,
          targetLabel: "Platform Architect",
        }),
      );

      mockAuditLog.logOrg.mockClear();
      await auditedService.update(
        created.id,
        { status: JobStatus.CLOSED },
        "org-1",
        "usr-2",
      );
      expect(mockAuditLog.logOrg).toHaveBeenCalledWith(
        "org-1",
        "usr-2",
        AUDIT_ACTIONS.JOB_STATUS_CHANGED,
        AUDIT_RESOURCES.JOB,
        expect.objectContaining({
          oldStatus: "PUBLISHED",
          newStatus: "CLOSED",
        }),
        undefined,
        expect.objectContaining({
          targetId: created.id,
          changes: [{ field: "status", before: "PUBLISHED", after: "CLOSED" }],
        }),
      );

      mockAuditLog.logOrg.mockClear();
      await auditedService.update(
        created.id,
        { title: "Principal Platform Architect", openings: 3 },
        "org-1",
        "usr-2",
      );
      expect(mockAuditLog.logOrg).toHaveBeenCalledWith(
        "org-1",
        "usr-2",
        AUDIT_ACTIONS.JOB_UPDATED,
        AUDIT_RESOURCES.JOB,
        expect.any(Object),
        undefined,
        expect.objectContaining({
          targetId: created.id,
          targetLabel: "Principal Platform Architect",
          changes: expect.arrayContaining([
            {
              field: "title",
              before: "Platform Architect",
              after: "Principal Platform Architect",
            },
            { field: "openings", before: 1, after: 3 },
          ]),
        }),
      );

      mockAuditLog.logOrg.mockClear();
      await auditedService.remove(created.id, "org-1", "usr-2");
      expect(mockAuditLog.logOrg).toHaveBeenCalledWith(
        "org-1",
        "usr-2",
        AUDIT_ACTIONS.JOB_DELETED,
        AUDIT_RESOURCES.JOB,
        expect.any(Object),
        undefined,
        expect.objectContaining({
          targetId: created.id,
          targetLabel: "Principal Platform Architect",
        }),
      );
    });

    it("persists, validates, normalizes, and audits applicationFormConfig on create and update", async () => {
      const created = await service.create({
        title: "Product Designer",
        department: "Design",
        location: "Hanoi",
        type: JobType.FULL_TIME,
        description: "Lead design systems",
        organizationId: "org-1",
        applicationFormConfig: {
          phone: "hidden",
          resume: "optional",
          coverLetter: "required",
          screeningQuestions: [
            {
              id: "q-portfolio",
              text: "Share your portfolio URL",
              type: "short_text",
              required: true,
            },
          ],
        },
      });

      expect(created.applicationFormConfig).toEqual({
        phone: "hidden",
        resume: "optional",
        coverLetter: "required",
        screeningQuestions: [
          {
            id: "q-portfolio",
            text: "Share your portfolio URL",
            type: "short_text",
            required: true,
          },
        ],
      });

      await expect(
        service.update(
          created.id,
          {
            applicationFormConfig: {
              phone: "optional",
              resume: "required",
              coverLetter: "hidden",
              screeningQuestions: [
                {
                  id: "q-bad",
                  text: "Pick one",
                  type: "single_choice",
                  required: true,
                  options: ["OnlyOne"],
                },
              ],
            },
          },
          "org-1",
        ),
      ).rejects.toThrow();
    });
  });
});
