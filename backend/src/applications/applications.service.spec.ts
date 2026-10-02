import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApplicationsService } from "./applications.service";
import { NotFoundException } from "@nestjs/common";
import { ApplicationStage } from "./dto/update-stage.dto";
import { AppConflictException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

describe("ApplicationsService - Multi-Tenant Candidate & Application Management", () => {
  let service: ApplicationsService;
  let mockPrismaService: {
    db: {
      orm: {
        public: Record<string, unknown>;
      };
    };
  };
  let mockMinioService: {
    uploadFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
    getObjectStream: ReturnType<typeof vi.fn>;
    extractObjectName: ReturnType<typeof vi.fn>;
  };

  interface MockJob {
    id: string;
    title: string;
    organizationId: string;
    department?: string;
    location?: string;
    status?: string;
  }

  interface MockCandidate {
    id: string;
    organizationId: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone: string;
    notes?: string | null;
    resumeUrl?: string | null;
    resumeFileName?: string | null;
    resumeFileSize?: number | null;
    resumeMimeType?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  interface MockApp {
    id: string;
    candidateId: string;
    jobId: string;
    stage: string;
    orderIndex?: number;
    matchScore?: number | null;
    notes?: string | null;
    resumeUrl?: string | null;
    resumeFileName?: string | null;
    resumeFileSize?: number | null;
    resumeMimeType?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  let mockJobs: MockJob[] = [];
  let mockCandidates: MockCandidate[] = [];
  let mockApps: MockApp[] = [];
  let mockCandidateDocs: Array<Record<string, unknown>> = [];

  beforeEach(() => {
      mockCandidateDocs = [
        {
          id: "doc-1",
          candidateId: "cand-1",
          organizationId: "org-1",
          name: "alice.pdf",
          url: "https://s3.local/resumes/alice.pdf",
          size: 1024,
          mimeType: "application/pdf",
          type: "Resume",
          createdAt: new Date(),
        },
      ];
    mockJobs = [
      {
        id: "job-org1-a",
        title: "Frontend Developer",
        organizationId: "org-1",
        status: "PUBLISHED",
      },
      {
        id: "job-org1-b",
        title: "Backend Developer",
        organizationId: "org-1",
        status: "PUBLISHED",
      },
      {
        id: "job-org2-c",
        title: "Competitor Designer",
        organizationId: "org-2", // Belongs to different organization!
        status: "PUBLISHED",
      },
    ];

    mockCandidates = [
      {
        id: "cand-1",
        organizationId: "org-1",
        name: "Alice Nguyen",
        email: "alice@gmail.com",
        phone: "0901234567",
        resumeUrl: "https://s3.local/resumes/alice.pdf",
        resumeFileName: "alice.pdf",
        resumeFileSize: 1024,
        resumeMimeType: "application/pdf",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cand-2",
        organizationId: "org-1",
        name: "Bob Tran",
        email: "bob@gmail.com",
        phone: "0912345678",
        resumeUrl: "https://s3.local/resumes/bob.pdf",
        resumeFileName: "bob.pdf",
        resumeFileSize: 2048,
        resumeMimeType: "application/pdf",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cand-3",
        organizationId: "org-2",
        name: "Charlie Competitor Candidate",
        email: "charlie@gmail.com",
        phone: "0987654321",
        resumeUrl: "https://s3.local/resumes/charlie.pdf",
        resumeFileName: "charlie.pdf",
        resumeFileSize: 3072,
        resumeMimeType: "application/pdf",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockApps = [
      {
        id: "app-1",
        candidateId: "cand-1",
        jobId: "job-org1-a",
        stage: "APPLIED",
        resumeUrl: "https://s3.local/resumes/alice.pdf",
        resumeFileName: "alice.pdf",
        resumeFileSize: 1024,
        resumeMimeType: "application/pdf",
        notes: null,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "app-2",
        candidateId: "cand-2",
        jobId: "job-org1-b",
        stage: "INTERVIEW",
        resumeUrl: "https://s3.local/resumes/bob.pdf",
        resumeFileName: "bob.pdf",
        resumeFileSize: 2048,
        resumeMimeType: "application/pdf",
        notes: null,
        orderIndex: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "app-3",
        candidateId: "cand-3",
        jobId: "job-org2-c", // Belongs to org-2!
        stage: "OFFER",
        resumeUrl: "https://s3.local/resumes/charlie.pdf",
        resumeFileName: "charlie.pdf",
        resumeFileSize: 3072,
        resumeMimeType: "application/pdf",
        notes: null,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockMinioService = {
      uploadFile: vi.fn().mockResolvedValue({
        url: "https://s3.local/resumes/uploaded.pdf",
        originalName: "uploaded.pdf",
        size: 512,
        mimeType: "application/pdf",
      }),
      deleteFile: vi.fn().mockResolvedValue(true),
      getObjectStream: vi.fn().mockResolvedValue({
        pipe: vi.fn(),
      }),
      extractObjectName: vi.fn().mockImplementation((url: string) => url.split("/").pop() || ""),
    };

    mockPrismaService = {
      db: {
        orm: {
          public: {
            CandidateDocument: {
              select: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return mockCandidateDocs.filter((d) => {
                      const mockRecord = {
                        candidateId: { eq: (target: string) => d.candidateId === target },
                      };
                      return predicateFn(mockRecord);
                    });
                  }),
                })),
              })),
              create: vi.fn().mockImplementation(async (data) => {
                mockCandidateDocs.push(data);
                return data;
              }),
              where: vi.fn().mockImplementation((predicateFn) => ({
                delete: vi.fn().mockImplementation(async () => {
                  const idx = mockCandidateDocs.findIndex((d) => {
                    const mockRecord = {
                      id: { eq: (target: string) => d.id === target },
                      url: { eq: (target: string) => d.url === target },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (idx !== -1) mockCandidateDocs.splice(idx, 1);
                  return { count: 1 };
                }),
              })),
            },
            Job: {
              select: vi.fn().mockImplementation((..._fields: string[]) => ({
                all: vi.fn().mockImplementation(async () => {
                  return mockJobs.map((j) => ({ ...j }));
                }),
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return mockJobs.filter((j) => {
                      const mockRecord = {
                        id: {
                          eq: (target: string) => j.id === target,
                          in: (arr: string[]) => arr.includes(j.id),
                        },
                        organizationId: { eq: (target: string) => j.organizationId === target },
                      };
                      return predicateFn(mockRecord);
                    });
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockJobs.find((j) => {
                      const mockRecord = {
                        id: { eq: (target: string) => j.id === target },
                      };
                      return predicateFn(mockRecord);
                    });
                    return match ? { ...match } : null;
                  }),
                })),
              })),
            },
            Candidate: {
              create: vi.fn().mockImplementation(async (data) => {
                const newCand = { id: `cand-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
                mockCandidates.push(newCand);
                return newCand;
              }),
              select: vi.fn().mockImplementation(() => {
                const createWhereBuilder = (predicates: Array<(r: Record<string, { eq?: (t: string) => boolean; in?: (a: string[]) => boolean }>) => boolean>) => ({
                  where: vi.fn().mockImplementation((nextFn) => createWhereBuilder([...predicates, nextFn])),
                  all: vi.fn().mockImplementation(async () => {
                    return mockCandidates.filter((c) => {
                      const mockRecord = {
                        id: {
                          eq: (target: string) => c.id === target,
                          in: (arr: string[]) => arr.includes(c.id),
                        },
                        organizationId: { eq: (target: string) => c.organizationId === target },
                        email: { eq: (target: string) => c.email === target },
                      };
                      return predicates.every((fn) => fn(mockRecord));
                    });
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockCandidates.find((c) => {
                      const mockRecord = {
                        id: { eq: (target: string) => c.id === target },
                        organizationId: { eq: (target: string) => c.organizationId === target },
                        email: { eq: (target: string) => c.email === target },
                      };
                      return predicates.every((fn) => fn(mockRecord));
                    });
                    return match ? { ...match } : null;
                  }),
                });

                return {
                  all: vi.fn().mockImplementation(async () => mockCandidates.map((c) => ({ ...c }))),
                  where: vi.fn().mockImplementation((predicateFn) => createWhereBuilder([predicateFn])),
                };
              }),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const target = mockCandidates.find((c) => {
                    const mockRecord = {
                      id: { eq: (targetId: string) => c.id === targetId },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (target) {
                    Object.assign(target, updates);
                    return { ...target };
                  }
                  return null;
                }),
              })),
            },
            Application: {
              select: vi.fn().mockImplementation((..._fields: string[]) => {
                const createAppWhereBuilder = (predicates: Array<(r: Record<string, { eq?: (t: string) => boolean; in?: (a: string[]) => boolean }>) => boolean>) => ({
                  where: vi.fn().mockImplementation((nextFn) => createAppWhereBuilder([...predicates, nextFn])),
                  all: vi.fn().mockImplementation(async () => {
                    return mockApps.filter((a) => {
                      const mockRecord = {
                        id: {
                          eq: (target: string) => a.id === target,
                          in: (arr: string[]) => arr.includes(a.id),
                        },
                        jobId: {
                          eq: (target: string) => a.jobId === target,
                          in: (arr: string[]) => arr.includes(a.jobId),
                        },
                        candidateId: {
                          eq: (target: string) => a.candidateId === target,
                          in: (arr: string[]) => arr.includes(a.candidateId),
                        },
                      };
                      return predicates.every((fn) => fn(mockRecord));
                    });
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockApps.find((a) => {
                      const mockRecord = {
                        id: { eq: (target: string) => a.id === target },
                        jobId: { eq: (target: string) => a.jobId === target },
                        candidateId: { eq: (target: string) => a.candidateId === target },
                      };
                      return predicates.every((fn) => fn(mockRecord));
                    });
                    return match ? { ...match } : null;
                  }),
                });

                return {
                  all: vi.fn().mockImplementation(async () => mockApps.map((a) => ({ ...a }))),
                  where: vi.fn().mockImplementation((predicateFn) => createAppWhereBuilder([predicateFn])),
                };
              }),
              create: vi.fn().mockImplementation(async (data) => {
                const newApp = { id: `app-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
                mockApps.push(newApp);
                return newApp;
              }),
              where: vi.fn().mockImplementation(function whereBuilder(predicateFn) {
                const predicates = [predicateFn];
                const builder = {
                  where: vi.fn().mockImplementation((nextFn) => {
                    predicates.push(nextFn);
                    return builder;
                  }),
                  update: vi.fn().mockImplementation(async (updates) => {
                    const target = mockApps.find((a) => {
                      const mockRecord = {
                        id: { eq: (targetId: string) => a.id === targetId },
                        jobId: { eq: (targetId: string) => a.jobId === targetId },
                        candidateId: { eq: (targetId: string) => a.candidateId === targetId },
                        stage: { eq: (targetStage: string) => a.stage === targetStage },
                      };
                      return predicates.every((fn) => fn(mockRecord));
                    });
                    if (target) {
                      Object.assign(target, updates);
                      return { ...target };
                    }
                    return null;
                  }),
                  delete: vi.fn().mockImplementation(async () => {
                    const idx = mockApps.findIndex((a) => {
                      const mockRecord = {
                        id: { eq: (targetId: string) => a.id === targetId },
                        jobId: { eq: (targetId: string) => a.jobId === targetId },
                        candidateId: { eq: (targetId: string) => a.candidateId === targetId },
                      };
                      return predicates.every((fn) => fn(mockRecord));
                    });
                    if (idx !== -1) mockApps.splice(idx, 1);
                    return { count: 1 };
                  }),
                };
                return builder;
              }),
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

    const mockActivitiesService = {
      createActivity: vi.fn().mockResolvedValue({}),
      findByCandidate: vi.fn().mockResolvedValue([]),
    };

    const mockEmailService = {
      getTemplateByType: vi.fn().mockResolvedValue(null),
      sendEmail: vi.fn().mockResolvedValue({}),
    };

    service = new ApplicationsService(
      mockPrismaService as never,
      mockMinioService as never,
      mockActivitiesService as never,
      mockEmailService as never,
    );
  });

  describe("Multi-Tenant Isolation", () => {
    it("should return ONLY applications belonging to org-1", async () => {
      const results = await service.findAll("org-1");

      expect(results.total).toBe(2);
      expect(results.data.length).toBe(2);
      expect(results.data.some((a) => a.candidateName === "Alice Nguyen")).toBe(true);
      expect(results.data.some((a) => a.candidateName === "Bob Tran")).toBe(true);
      // Strictly verify org-2 candidate is NEVER present
      expect(results.data.some((a) => a.candidateName === "Charlie Competitor Candidate")).toBe(false);
    });

    it("should return ONLY applications belonging to org-2", async () => {
      const results = await service.findAll("org-2");

      expect(results.total).toBe(1);
      expect(results.data.length).toBe(1);
      expect(results.data[0].candidateName).toBe("Charlie Competitor Candidate");
    });

    it("should return empty array if organizationId is not provided", async () => {
      const results = await service.findAll(undefined);
      expect(results.data).toEqual([]);
      expect(results.total).toBe(0);
    });

    it("should return empty array if organization has no jobs", async () => {
      const results = await service.findAll("non-existent-org");
      expect(results.data).toEqual([]);
      expect(results.total).toBe(0);
    });
  });

  describe("Job Applications & Stages", () => {
    it("should find applications for a specific job", async () => {
      const apps = await service.findByJob("job-org1-a");
      expect(apps.length).toBe(1);
      expect(apps[0].candidateName).toBe("Alice Nguyen");
    });

    it("should throw NotFoundException when finding by non-existent job", async () => {
      await expect(service.findByJob("invalid-job")).rejects.toThrow(NotFoundException);
    });

    it("should throw AppForbiddenException when accessing job applications from another organization", async () => {
      await expect(service.findByJob("job-1", "foreign-org-id")).rejects.toThrow();
    });

    it("should find a specific application by id", async () => {
      const app = await service.findOne("app-1");
      expect(app).toBeDefined();
      expect(app.candidateName).toBe("Alice Nguyen");
    });

    it("should update application stage through valid lifecycle transitions", async () => {
      // APPLIED -> SCREENING
      const s1 = await service.updateStage("app-1", {
        stage: ApplicationStage.SCREENING,
        orderIndex: 2,
      });
      expect(s1?.stage).toBe(ApplicationStage.SCREENING);
      expect(s1?.orderIndex).toBe(2);

      // SCREENING -> INTERVIEW
      const s2 = await service.updateStage("app-1", {
        stage: ApplicationStage.INTERVIEW,
      });
      expect(s2?.stage).toBe(ApplicationStage.INTERVIEW);

      // INTERVIEW -> OFFER
      const s3 = await service.updateStage("app-1", {
        stage: ApplicationStage.OFFER,
      });
      expect(s3?.stage).toBe(ApplicationStage.OFFER);

      // OFFER -> HIRED
      const s4 = await service.updateStage("app-1", {
        stage: ApplicationStage.HIRED,
      });
      expect(s4?.stage).toBe(ApplicationStage.HIRED);
    });

    it("should reject invalid stage transitions without changing database state", async () => {
      // 1. APPLIED -> HIRED (skipping screening/interview/offer)
      await expect(
        service.updateStage("app-1", { stage: ApplicationStage.HIRED }),
      ).rejects.toThrow();

      let app = await service.findOne("app-1");
      expect(app.stage).toBe(ApplicationStage.APPLIED);

      // 2. APPLIED -> OFFER (skipping stages)
      await expect(
        service.updateStage("app-1", { stage: ApplicationStage.OFFER }),
      ).rejects.toThrow();

      app = await service.findOne("app-1");
      expect(app.stage).toBe(ApplicationStage.APPLIED);

      // 3. Move to REJECTED (terminal state)
      await service.updateStage("app-1", { stage: ApplicationStage.REJECTED });
      app = await service.findOne("app-1");
      expect(app.stage).toBe(ApplicationStage.REJECTED);

      // 4. REJECTED -> OFFER (invalid from terminal)
      await expect(
        service.updateStage("app-1", { stage: ApplicationStage.OFFER }),
      ).rejects.toThrow();

      app = await service.findOne("app-1");
      expect(app.stage).toBe(ApplicationStage.REJECTED);
    });

    it("should allow sequential valid updates to next stages", async () => {
      // app-1 starts at APPLIED
      const step1 = await service.updateStage("app-1", { stage: ApplicationStage.SCREENING });
      expect(step1.stage).toBe(ApplicationStage.SCREENING);

      const step2 = await service.updateStage("app-1", { stage: ApplicationStage.INTERVIEW });
      expect(step2.stage).toBe(ApplicationStage.INTERVIEW);
    });

    it("should enforce optimistic locking during concurrent race updates: 1 succeeds, 1 receives 409 conflict", async () => {
      // app-1 starts at APPLIED. Both see APPLIED.
      const p1 = service.updateStage("app-1", { stage: ApplicationStage.SCREENING });
      const p2 = service.updateStage("app-1", { stage: ApplicationStage.REJECTED });

      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const err = (rejected[0] as PromiseRejectedResult).reason;
      expect(err).toBeInstanceOf(AppConflictException);
      expect(err.code).toBe(APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT);
    });

    it("should throw NotFoundException when updating non-existent application", async () => {
      await expect(
        service.updateStage("non-existent-app-id", { stage: ApplicationStage.SCREENING }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update candidate personal information", async () => {
      const updated = await service.updateCandidate("app-1", {
        candidateName: "Alice Nguyen (Updated)",
        candidatePhone: "0999999999",
      });

      expect(updated.candidateName).toBe("Alice Nguyen (Updated)");
      expect(updated.candidatePhone).toBe("0999999999");
    });

    it("should delete an application and record audit activity log", async () => {
      const result = await service.remove("app-1");
      expect(result.success).toBe(true);
      await expect(service.findOne("app-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("Application Creation & Validations", () => {
    it("should throw when target job does not exist", async () => {
      await expect(
        service.create({
          jobId: "non-existent-job",
          candidateName: "Test Candidate",
          candidateEmail: "test@example.com",
        }),
      ).rejects.toThrow();
    });

    it("should throw when candidate belongs to different organization than job", async () => {
      // cand-3 belongs to org-2, job-org1-a belongs to org-1
      await expect(
        service.create({
          jobId: "job-org1-a",
          candidateId: "cand-3",
        }),
      ).rejects.toThrow();
    });

    it("should throw when candidate already applied to the same job", async () => {
      // cand-1 is already applied to job-org1-a via app-1
      await expect(
        service.create({
          jobId: "job-org1-a",
          candidateId: "cand-1",
        }),
      ).rejects.toThrow();
    });

    it("should throw when candidateId is missing and name/email are missing", async () => {
      await expect(
        service.create({
          jobId: "job-org1-a",
        }),
      ).rejects.toThrow();
    });

    it("should create application and new candidate when valid info provided", async () => {
      const created = await service.create({
        jobId: "job-org1-a",
        candidateName: "David Beckham",
        candidateEmail: "david@example.com",
        candidatePhone: "0123456789",
      });

      expect(created).toBeDefined();
      expect(created.candidateName).toBe("David Beckham");
      expect(created.jobId).toBe("job-org1-a");
    });
  });

  describe("Document Management & Downloads", () => {
    it("should reject uploadDocument if file is missing", async () => {
      await expect(
        service.uploadDocument("app-2", null as never),
      ).rejects.toThrow();
    });

    it("should upload document and attach to application and candidate", async () => {
      const mockFile = {
        originalname: "portfolio.pdf",
        mimetype: "application/pdf",
        size: 2048,
        buffer: Buffer.from("%PDF-1.4\ntest pdf content\n%%EOF"),
      } as Express.Multer.File;

      const updated = await service.uploadDocument("app-2", mockFile, "Portfolio");
      expect(updated).toBeDefined();
      expect(mockMinioService.uploadFile).toHaveBeenCalled();
    });

    it("should get candidate documents list", async () => {
      const docs = await service.getCandidateDocuments("cand-1");
      expect(docs.length).toBeGreaterThanOrEqual(1);
      expect(docs[0].name).toBe("alice.pdf");
    });

    it("should prepare document download stream", async () => {
      const download = await service.prepareDocumentDownload(
        "app-2",
        "https://s3.local/resumes/bob.pdf",
        "bob.pdf",
        "org-1",
        { id: "recruiter-1", name: "Recruiter Bob" },
      );

      expect(download.cleanFileName).toBe("bob.pdf");
      expect(download.stream).toBeDefined();
      expect(mockMinioService.getObjectStream).toHaveBeenCalled();
    });

    it("should block document download if targetUrl does not belong to application (SSRF guard)", async () => {
      await expect(
        service.prepareDocumentDownload(
          "app-2",
          "https://s3.local/other-org-bucket/secret.pdf",
        ),
      ).rejects.toThrow();
    });

    it("should delete document and clear resume fields from application", async () => {
      const result = await service.deleteDocument("app-2", { url: "https://s3.local/resumes/bob.pdf" });
      expect(result).toBeDefined();
      expect(result.id).toBe("app-2");
    });
  });

  describe("Job Query Guardrails", () => {
    it("should reject findByJob if job does not exist", async () => {
      await expect(service.findByJob("unknown-job-id")).rejects.toThrow();
    });

    it("should reject findByJob if job belongs to another organization", async () => {
      // job-org2-c belongs to org-2
      await expect(service.findByJob("job-org2-c", "org-1")).rejects.toThrow();
    });
  });
});
