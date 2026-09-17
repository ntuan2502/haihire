import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApplicationsService } from "./applications.service";
import { NotFoundException } from "@nestjs/common";
import { ApplicationStage } from "./dto/update-stage.dto";

describe("ApplicationsService - Multi-Tenant Candidate & Application Management", () => {
  let service: ApplicationsService;
  let mockPrismaService: any;
  let mockMinioService: any;

  let mockJobs: any[] = [];
  let mockCandidates: any[] = [];
  let mockApps: any[] = [];

  beforeEach(() => {
    mockJobs = [
      {
        id: "job-org1-a",
        title: "Frontend Developer",
        organizationId: "org-1",
      },
      {
        id: "job-org1-b",
        title: "Backend Developer",
        organizationId: "org-1",
      },
      {
        id: "job-org2-c",
        title: "Competitor Designer",
        organizationId: "org-2", // Belongs to different organization!
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
        fileName: "uploaded.pdf",
        size: 512,
        mimeType: "application/pdf",
      }),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    mockPrismaService = {
      db: {
        orm: {
          public: {
            Job: {
              select: vi.fn().mockImplementation((...fields: string[]) => ({
                all: vi.fn().mockImplementation(async () => {
                  return mockJobs.map((j) => ({ ...j }));
                }),
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return mockJobs.filter((j) => {
                      const mockRecord = {
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
              select: vi.fn().mockImplementation(() => ({
                all: vi.fn().mockImplementation(async () => {
                  return mockCandidates.map((c) => ({ ...c }));
                }),
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return mockCandidates.filter((c) => {
                      const mockRecord = {
                        id: { eq: (target: string) => c.id === target },
                        organizationId: { eq: (target: string) => c.organizationId === target },
                        email: { eq: (target: string) => c.email === target },
                      };
                      return predicateFn(mockRecord);
                    });
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockCandidates.find((c) => {
                      const mockRecord = {
                        id: { eq: (target: string) => c.id === target },
                        organizationId: { eq: (target: string) => c.organizationId === target },
                        email: { eq: (target: string) => c.email === target },
                      };
                      return predicateFn(mockRecord);
                    });
                    return match ? { ...match } : null;
                  }),
                })),
              })),
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
              select: vi.fn().mockImplementation((...fields: string[]) => ({
                all: vi.fn().mockImplementation(async () => {
                  return mockApps.map((a) => ({ ...a }));
                }),
                where: vi.fn().mockImplementation((predicateFn) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return mockApps.filter((a) => {
                      const mockRecord = {
                        id: { eq: (target: string) => a.id === target },
                        jobId: { eq: (target: string) => a.jobId === target },
                        candidateId: { eq: (target: string) => a.candidateId === target },
                      };
                      return predicateFn(mockRecord);
                    });
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockApps.find((a) => {
                      const mockRecord = {
                        id: { eq: (target: string) => a.id === target },
                        jobId: { eq: (target: string) => a.jobId === target },
                        candidateId: { eq: (target: string) => a.candidateId === target },
                      };
                      return predicateFn(mockRecord);
                    });
                    return match ? { ...match } : null;
                  }),
                })),
              })),
              create: vi.fn().mockImplementation(async (data) => {
                const newApp = { id: `app-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
                mockApps.push(newApp);
                return newApp;
              }),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const target = mockApps.find((a) => {
                    const mockRecord = {
                      id: { eq: (targetId: string) => a.id === targetId },
                      jobId: { eq: (targetId: string) => a.jobId === targetId },
                      candidateId: { eq: (targetId: string) => a.candidateId === targetId },
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
                  const idx = mockApps.findIndex((a) => {
                    const mockRecord = {
                      id: { eq: (targetId: string) => a.id === targetId },
                      jobId: { eq: (targetId: string) => a.jobId === targetId },
                      candidateId: { eq: (targetId: string) => a.candidateId === targetId },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (idx !== -1) mockApps.splice(idx, 1);
                  return { count: 1 };
                }),
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

    service = new ApplicationsService(mockPrismaService as any, mockMinioService as any);
  });

  describe("Multi-Tenant Isolation", () => {
    it("should return ONLY applications belonging to org-1", async () => {
      const results = await service.findAll("org-1");

      expect(results.length).toBe(2);
      expect(results.some((a) => a.candidateName === "Alice Nguyen")).toBe(true);
      expect(results.some((a) => a.candidateName === "Bob Tran")).toBe(true);
      // Strictly verify org-2 candidate is NEVER present
      expect(results.some((a) => a.candidateName === "Charlie Competitor Candidate")).toBe(false);
    });

    it("should return ONLY applications belonging to org-2", async () => {
      const results = await service.findAll("org-2");

      expect(results.length).toBe(1);
      expect(results[0].candidateName).toBe("Charlie Competitor Candidate");
    });

    it("should return empty array if organizationId is not provided", async () => {
      const results = await service.findAll(undefined);
      expect(results).toEqual([]);
    });

    it("should return empty array if organization has no jobs", async () => {
      const results = await service.findAll("non-existent-org");
      expect(results).toEqual([]);
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

    it("should find a specific application by id", async () => {
      const app = await service.findOne("app-1");
      expect(app).toBeDefined();
      expect(app.candidateName).toBe("Alice Nguyen");
    });

    it("should update application stage and orderIndex", async () => {
      const updated = await service.updateStage("app-1", {
        stage: ApplicationStage.OFFER,
        orderIndex: 5,
      });

      expect(updated?.stage).toBe(ApplicationStage.OFFER);
      expect(updated?.orderIndex).toBe(5);
    });

    it("should update candidate personal information", async () => {
      const updated = await service.updateCandidate("app-1", {
        candidateName: "Alice Nguyen (Updated)",
        candidatePhone: "0999999999",
      });

      expect(updated.candidateName).toBe("Alice Nguyen (Updated)");
      expect(updated.candidatePhone).toBe("0999999999");
    });

    it("should delete an application", async () => {
      const result = await service.remove("app-1");
      expect(result.success).toBe(true);
      await expect(service.findOne("app-1")).rejects.toThrow(NotFoundException);
    });
  });
});
