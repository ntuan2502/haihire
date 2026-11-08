import { createMockTable, createMockPrismaService } from "../test/helpers/prisma-composer-mock";
import { describe, it, expect, beforeEach } from "vitest";
import { JobsService } from "./jobs.service";
import { JobsController } from "./jobs.controller";
import { NotFoundException } from "@nestjs/common";
import { JobStatus, JobType } from "./dto/create-job.dto";

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
    requirements: string;
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
        description: "Develop scalable apps",
        requirements: "5+ years TS/React",
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
        description: "Design UI/UX",
        requirements: "Figma expert",
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
        description: "Grow brand awareness",
        requirements: "SEO / Ads",
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
      const results = await service.findAll({
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
      const results = await service.findAll({
        organizationId: "org-2",
        tenantOrgId: "org-2",
      });

      expect(results.total).toBe(1);
      expect(results.data.length).toBe(1);
      expect(results.data[0].title).toBe("Marketing Lead (Competitor Org)");
      expect(results.data[0].organizationId).toBe("org-2");
    });

    it("should compute application metrics correctly per job", async () => {
      const results = await service.findAll({ tenantOrgId: "org-1" });
      const job1 = results.data.find((j) => j.id === "job-1");

      expect(job1?.applicationsCount).toBe(2);
      expect(job1?.applicationsByStage.APPLIED).toBe(1);
      expect(job1?.applicationsByStage.INTERVIEW).toBe(1);
    });

    it("should paginate jobs correctly", async () => {
      const paged = await service.findAll({
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
      const published = await service.findAll({
        tenantOrgId: "org-1",
        status: "PUBLISHED",
      });
      expect(published.total).toBe(1);
      expect(published.data.length).toBe(1);
      expect(published.data[0].id).toBe("job-1");

      const drafts = await service.findAll({
        tenantOrgId: "org-1",
        status: "DRAFT",
      });
      expect(drafts.total).toBe(1);
      expect(drafts.data.length).toBe(1);
      expect(drafts.data[0].id).toBe("job-2");
    });

    it("should search jobs by keyword", async () => {
      const searchResults = await service.findAll({
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
          requirements: "None",
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
          requirements: "None",
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

      const results = await controller.findAll(request);
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
      const results = await service.findAll({
        organizationSlug: "acme-corp",
        tenantOrgId: "org-2",
      });

      expect(results.data.map((job) => job.id)).toEqual(["job-1"]);
    });

    it("should return ONLY PUBLISHED jobs for unauthenticated career page requests", async () => {
      const results = await service.findAll({
        organizationSlug: "acme-corp",
      });

      // job-1 is PUBLISHED; job-2 is DRAFT; job-closed is CLOSED; job-archived is ARCHIVED
      expect(results.total).toBe(1);
      expect(results.data.length).toBe(1);
      expect(results.data[0].id).toBe("job-1");
      expect(results.data[0].status).toBe("PUBLISHED");
    });

    it("should reject exposing DRAFT/CLOSED jobs even if unauthenticated user requests status query param", async () => {
      const draftReq = await service.findAll({
        organizationSlug: "acme-corp",
        status: "DRAFT",
      });
      // Should not return draft jobs
      expect(draftReq.data.some((j) => j.status === "DRAFT")).toBe(false);

      const closedReq = await service.findAll({
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
  });
});
