import { describe, it, expect, beforeEach, vi } from "vitest";
import { JobsService } from "./jobs.service";
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

    mockPrismaService = {
      db: {
        orm: {
          public: {
            Job: {
              select: vi.fn().mockImplementation((..._fields: string[]) => ({
                all: vi.fn().mockImplementation(async () => {
                  return mockJobs.map((j) => ({ ...j }));
                }),
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return mockJobs
                      .filter((j) => {
                        const mockRecord = {
                          id: { eq: (target: string) => j.id === target },
                          organizationId: { eq: (target: string) => j.organizationId === target },
                        };
                        return predicateFn(mockRecord);
                      })
                      .map((j) => ({ ...j }));
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockJobs.find((j) => {
                      const mockRecord = {
                        id: { eq: (target: string) => j.id === target },
                        organizationId: { eq: (target: string) => j.organizationId === target },
                      };
                      return predicateFn(mockRecord);
                    });
                    return match ? { ...match } : null;
                  }),
                })),
              })),
              upsert: vi.fn().mockImplementation(async ({ create }) => {
                mockJobs.push({ ...create, createdAt: new Date(), updatedAt: new Date() });
                return create;
              }),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const target = mockJobs.find((j) => {
                    const mockRecord = {
                      id: { eq: (targetId: string) => j.id === targetId },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (target) {
                    Object.assign(target, updates);
                    return { ...target };
                  }
                  return null;
                }),
                delete: vi.fn().mockImplementation(async () => {
                  const idx = mockJobs.findIndex((j) => {
                    const mockRecord = {
                      id: { eq: (targetId: string) => j.id === targetId },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (idx !== -1) mockJobs.splice(idx, 1);
                  return { count: 1 };
                }),
              })),
            },
            Application: {
              select: vi.fn().mockImplementation(() => ({
                all: vi.fn().mockImplementation(async () => {
                  return mockApps.map((a) => ({ ...a }));
                }),
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return mockApps.filter((a) => {
                      const mockRecord = {
                        jobId: {
                          eq: (targetId: string) => a.jobId === targetId,
                          in: (arr: string[]) => arr.includes(a.jobId),
                        },
                      };
                      return predicateFn(mockRecord);
                    });
                  }),
                })),
              })),
              where: vi.fn().mockImplementation(() => ({
                delete: vi.fn().mockResolvedValue({ count: 1 }),
              })),
            },
            Organization: {
              select: vi.fn().mockImplementation(() => ({
                all: vi.fn().mockResolvedValue([
                  { id: "org-1", name: "Acme Corp", slug: "acme-corp" },
                  { id: "org-2", name: "Beta Corp", slug: "beta-corp" },
                ]),
                where: vi.fn().mockImplementation(() => ({
                  first: vi.fn().mockResolvedValue({
                    id: "org-1",
                    name: "Acme Corp",
                    slug: "acme-corp",
                  }),
                })),
              })),
            },
            Candidate: {
              select: vi.fn().mockImplementation(() => ({
                all: vi.fn().mockResolvedValue([]),
                where: vi.fn().mockImplementation(() => ({
                  all: vi.fn().mockResolvedValue([]),
                  first: vi.fn().mockResolvedValue(null),
                })),
              })),
            },
            Interview: {
              all: vi.fn().mockResolvedValue([]),
              where: vi.fn().mockImplementation(() => ({
                all: vi.fn().mockResolvedValue([]),
              })),
            },
          },
        },
      },
    };

    service = new JobsService(mockPrismaService as never);
  });

  describe("Multi-Tenant Isolation", () => {
    it("should return only jobs belonging to org-1 when filtered by org-1", async () => {
      const results = await service.findAll({ organizationId: "org-1" });

      expect(results.total).toBe(2);
      expect(results.data.length).toBe(2);
      expect(results.data.every((j) => j.organizationId === "org-1")).toBe(true);
      expect(results.data.some((j) => j.title.includes("Competitor Org"))).toBe(false);
    });

    it("should return only jobs belonging to org-2 when filtered by org-2", async () => {
      const results = await service.findAll({ organizationId: "org-2" });

      expect(results.total).toBe(1);
      expect(results.data.length).toBe(1);
      expect(results.data[0].title).toBe("Marketing Lead (Competitor Org)");
      expect(results.data[0].organizationId).toBe("org-2");
    });

    it("should compute application metrics correctly per job", async () => {
      const results = await service.findAll({ organizationId: "org-1" });
      const job1 = results.data.find((j) => j.id === "job-1");

      expect(job1?.applicationsCount).toBe(2);
      expect(job1?.applicationsByStage.APPLIED).toBe(1);
      expect(job1?.applicationsByStage.INTERVIEW).toBe(1);
    });

    it("should paginate jobs correctly", async () => {
      const paged = await service.findAll({ organizationId: "org-1", page: 1, limit: 1 });

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
        organizationId: "org-1",
        status: "PUBLISHED",
      });
      expect(published.total).toBe(1);
      expect(published.data.length).toBe(1);
      expect(published.data[0].id).toBe("job-1");

      const drafts = await service.findAll({
        organizationId: "org-1",
        status: "DRAFT",
      });
      expect(drafts.total).toBe(1);
      expect(drafts.data.length).toBe(1);
      expect(drafts.data[0].id).toBe("job-2");
    });

    it("should search jobs by keyword", async () => {
      const searchResults = await service.findAll({
        organizationId: "org-1",
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
});
