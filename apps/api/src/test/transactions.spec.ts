import { describe, it, expect, vi, beforeEach } from "vitest";
import { AsyncLocalStorage } from "node:async_hooks";
import { ApplicationsService } from "../applications/applications.service";
import { OrganizationsService } from "../organizations/organizations.service";
import { JobsService } from "../jobs/jobs.service";
import { CandidatesService } from "../candidates/candidates.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { MinioService } from "../minio/minio.service";
import type { ActivitiesService } from "../activities/activities.service";
import type { EmailService } from "../email/email.service";
import { createMockPrismaService } from "./helpers/prisma-composer-mock";

interface MockJob {
  id: string;
  title: string;
  organizationId: string;
  status: string;
  department?: string;
  location?: string;
  deletedAt?: string;
}

interface MockCandidate {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  deletedAt?: string;
  [key: string]: unknown;
}

interface MockApplication {
  id: string;
  jobId: string;
  candidateId: string;
  stage?: string;
  orderIndex?: number;
  [key: string]: unknown;
}

interface MockUser {
  id: string;
  organizationId: string | null;
  role: string;
  [key: string]: unknown;
}

interface MockMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  [key: string]: unknown;
}

interface MockOrg {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  [key: string]: unknown;
}

interface MockInterview {
  id?: string;
  applicationId: string;
  [key: string]: unknown;
}

interface MockDbState {
  candidates: MockCandidate[];
  applications: MockApplication[];
  jobs: MockJob[];
  users: MockUser[];
  members: MockMember[];
  orgs: MockOrg[];
  interviews: MockInterview[];
}


describe("Database Transactions & Saga Pattern Verification (Phase 16A)", () => {
  let mockDbState: MockDbState;

  let transactionCalls: number;
  let transactionRollbacks: number;
  let minioUploadedFiles: string[];
  let minioDeletedFiles: string[];

  let mockPrisma: PrismaService;
  let mockMinio: MinioService;
  let mockActivities: ActivitiesService;
  let mockEmail: EmailService;
  let createDbInterface: (stateRef: MockDbState) => PrismaService;

  beforeEach(() => {
    transactionCalls = 0;
    transactionRollbacks = 0;
    minioUploadedFiles = [];
    minioDeletedFiles = [];

    mockDbState = {
      candidates: [],
      applications: [],
      jobs: [
        {
          id: "job-1",
          title: "Senior Backend Engineer",
          organizationId: "org-1",
          status: "PUBLISHED",
          department: "Engineering",
          location: "Remote",
        },
      ],
      users: [
        { id: "user-owner", organizationId: "org-1", role: "ADMIN" },
        { id: "user-member", organizationId: "org-1", role: "MEMBER" },
      ],
      members: [
        {
          id: "mem-1",
          organizationId: "org-1",
          userId: "user-owner",
          role: "ADMIN",
        },
        {
          id: "mem-2",
          organizationId: "org-1",
          userId: "user-member",
          role: "MEMBER",
        },
      ],
      orgs: [
        { id: "org-1", name: "Acme Corp", slug: "acme", ownerId: "user-owner" },
      ],
      interviews: [],
    };

    createDbInterface = (stateRef: MockDbState) =>
      createMockPrismaService({
        candidate: stateRef.candidates,
        application: stateRef.applications,
        job: stateRef.jobs,
        user: stateRef.users,
        organizationMember: stateRef.members,
        organization: stateRef.orgs,
        interview: stateRef.interviews,
        trackingLink: [],
      });

    const realDb = createDbInterface(mockDbState);
    const als = new AsyncLocalStorage<PrismaService>();

    const txMock = vi
      .fn()
      .mockImplementation(
        async (txFn: (tx: PrismaService) => Promise<unknown>) => {
          const existing = als.getStore();
          if (existing) {
            return txFn(existing);
          }

          transactionCalls++;
          const snapshot = JSON.parse(
            JSON.stringify(mockDbState),
          ) as MockDbState;
          const txDb = createDbInterface(snapshot);

          try {
            const result = await als.run(txDb, () => txFn(txDb));
            for (const c of snapshot.candidates) {
              const idx = mockDbState.candidates.findIndex(
                (x) => x.id === c.id,
              );
              if (idx >= 0) Object.assign(mockDbState.candidates[idx], c);
              else mockDbState.candidates.push(c);
            }
            for (const a of snapshot.applications) {
              const idx = mockDbState.applications.findIndex(
                (x) => x.id === a.id,
              );
              if (idx >= 0) Object.assign(mockDbState.applications[idx], a);
              else mockDbState.applications.push(a);
            }
            if (
              snapshot.applications.length < mockDbState.applications.length
            ) {
              mockDbState.applications = mockDbState.applications.filter(
                (a) => snapshot.applications.some((s) => s.id === a.id),
              );
            }
            for (const j of snapshot.jobs) {
              const idx = mockDbState.jobs.findIndex((x) => x.id === j.id);
              if (idx >= 0) Object.assign(mockDbState.jobs[idx], j);
              else mockDbState.jobs.push(j);
            }
            for (const u of snapshot.users) {
              const idx = mockDbState.users.findIndex((x) => x.id === u.id);
              if (idx >= 0) Object.assign(mockDbState.users[idx], u);
            }
            mockDbState.members = snapshot.members;
            mockDbState.orgs = snapshot.orgs;
            mockDbState.interviews = snapshot.interviews;
            return result;
          } catch (err) {
            transactionRollbacks++;
            throw err;
          }
        },
      );

    mockPrisma = new Proxy(realDb, {
      get: (target, prop) => {
        if (
          prop === "transaction" ||
          prop === "$transaction" ||
          prop === "executeTx"
        ) {
          return txMock;
        }
        return (target as unknown as Record<string | symbol, unknown>)[prop];
      },
    }) as unknown as PrismaService;

    mockMinio = {
      uploadFile: vi
        .fn()
        .mockImplementation(
          async (_file: Express.Multer.File, folder: string, orgId: string) => {
            const fileName = `tenants/${orgId}/${folder}/test-resume.pdf`;
            minioUploadedFiles.push(fileName);
            return {
              url: `http://minio:9000/haihire-resumes/${fileName}`,
              fileName,
              originalName: "test-resume.pdf",
              size: 1024,
              mimeType: "application/pdf",
            };
          },
        ),
      deleteFile: vi.fn().mockImplementation(async (fileName: string) => {
        minioDeletedFiles.push(fileName);
      }),
      extractObjectName: vi.fn().mockImplementation((url: string) => {
        return url.replace("http://minio:9000/haihire-resumes/", "");
      }),
    } as unknown as MinioService;

    mockActivities = {
      createActivity: vi.fn().mockResolvedValue({}),
    } as unknown as ActivitiesService;

    mockEmail = {
      getTemplateByType: vi.fn().mockResolvedValue(null),
      sendEmail: vi.fn().mockResolvedValue({}),
    } as unknown as EmailService;
  });

  describe("ApplicationsService::create (Saga & DB Transaction)", () => {
    it("Happy Path: executes within a transaction and commits candidate & application", async () => {
      const appService = new ApplicationsService(
        mockPrisma,
        mockMinio,
        mockActivities,
        mockEmail,
      );

      const mockFile = {
        fieldname: "resume",
        originalname: "john_doe_cv.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        size: 2048,
        buffer: Buffer.from("%PDF-1.4 test resume content\n%%EOF"),
      } as Express.Multer.File;

      const result = await appService.create(
        {
          jobId: "job-1",
          candidateName: "John Doe",
          candidateEmail: "john@example.com",
        },
        mockFile,
      );

      expect(transactionCalls).toBe(1);
      expect(result).toBeDefined();
      expect(mockDbState.candidates.length).toBe(1);
      expect(mockDbState.applications.length).toBe(1);
      expect(minioUploadedFiles.length).toBe(1);
      expect(minioDeletedFiles.length).toBe(0);
    });

    it("Failure Scenario & Repro: DB failure triggers transaction rollback AND MinIO compensating delete", async () => {
      const appService = new ApplicationsService(
        mockPrisma,
        mockMinio,
        mockActivities,
        mockEmail,
      );

      // Force failure during transaction (e.g. simulate unique constraint or DB connection drop)
      (
        mockPrisma as unknown as { transaction: ReturnType<typeof vi.fn> }
      ).transaction.mockImplementationOnce(
        async (txFn: (tx: PrismaService) => Promise<unknown>) => {
          transactionCalls++;
          const snapshot = JSON.parse(
            JSON.stringify(mockDbState),
          ) as MockDbState;
          const txDb = createDbInterface(snapshot);
          const crashFn = vi.fn().mockRejectedValue(new Error("Simulated DB Crash on Application write"));
          txDb.application.create = crashFn;
          try {
            return await txFn(txDb);
          } catch (e) {
            transactionRollbacks++;
            throw e;
          }
        },
      );

      const mockFile = {
        fieldname: "resume",
        originalname: "fatal_cv.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        size: 2048,
        buffer: Buffer.from("%PDF-1.4 test resume content\n%%EOF"),
      } as Express.Multer.File;

      await expect(
        appService.create(
          {
            jobId: "job-1",
            candidateName: "Fatal Candidate",
            candidateEmail: "fatal@example.com",
          },
          mockFile,
        ),
      ).rejects.toThrow("Simulated DB Crash on Application write");

      // Verify transaction rolled back
      expect(transactionCalls).toBe(1);
      expect(transactionRollbacks).toBe(1);
      // Verify no orphan records in DB
      expect(mockDbState.applications.length).toBe(0);
      expect(mockDbState.candidates.length).toBe(0);
      // SAGA VERIFICATION: MinIO file was deleted by compensating action!
      expect(minioUploadedFiles.length).toBe(1);
      expect(minioDeletedFiles.length).toBe(1);
      expect(minioDeletedFiles[0]).toBe(minioUploadedFiles[0]);
    });
  });

  describe("ApplicationsService::remove", () => {
    it("deletes application and interviews atomically inside transaction", async () => {
      mockDbState.applications.push({
        id: "app-100",
        jobId: "job-1",
        candidateId: "cand-100",
        stage: "APPLIED",
        orderIndex: 0,
      });

      const appService = new ApplicationsService(
        mockPrisma,
        mockMinio,
        mockActivities,
        mockEmail,
      );

      const res = await appService.remove("app-100", "org-1");
      expect(res.success).toBe(true);
      expect(transactionCalls).toBe(1);
      expect(mockDbState.applications.length).toBe(0);
    });
  });

  describe("OrganizationsService::deleteMyOrg", () => {
    it("unlinks users, deletes memberships, and deletes organization atomically inside a single transaction", async () => {
      const orgService = new OrganizationsService(mockPrisma);

      const res = await orgService.deleteMyOrg("user-owner");
      expect(res.success).toBe(true);
      expect(transactionCalls).toBe(1);
      // Verify all 3 steps completed atomically
      expect(mockDbState.orgs.length).toBe(0);
      expect(mockDbState.members.length).toBe(0);
      expect(mockDbState.users.every((u) => u.organizationId === null)).toBe(
        true,
      );
    });
  });

  describe("JobsService & CandidatesService Soft Deletion", () => {
    it("soft deletes job inside atomic transaction", async () => {
      const jobsService = new JobsService(mockPrisma);
      const res = await jobsService.remove("job-1", "org-1");
      expect(res.success).toBe(true);
      expect(transactionCalls).toBe(1);
      expect(mockDbState.jobs[0].deletedAt).toBeDefined();
    });

    it("soft deletes candidate inside atomic transaction", async () => {
      mockDbState.candidates.push({
        id: "cand-1",
        organizationId: "org-1",
        name: "Test Candidate",
        email: "cand@test.com",
      });
      const candService = new CandidatesService(mockPrisma, mockMinio);
      const res = await candService.remove("cand-1", "org-1");
      expect(res.success).toBe(true);
      expect(transactionCalls).toBe(1);
      expect(mockDbState.candidates[0].deletedAt).toBeDefined();
    });
  });

  describe("Nested Transaction & AsyncLocalStorage Propagation (Phase 17 Item 1)", () => {
    it("Test 1: Nested executeTx reuses parent transaction without opening a new one", async () => {
      let innerRan = false;
      await mockPrisma.transaction(async (tx1: PrismaService) => {
        // First level mutation
        await tx1.job.update({
          where: { id: "job-1" },
          data: { title: "Updated Job Title" },
        });

        // Nested call simulates another service calling executeTx / transaction
        await mockPrisma.transaction(async (tx2: PrismaService) => {
          expect(tx2).toBe(tx1); // REUSED EXACT SAME CONTEXT
          await tx2.candidate.create({
            data: {
              id: "cand-nested",
              organizationId: "org-1",
              name: "Nested Cand",
              email: "nested@test.com",
            },
          });
          innerRan = true;
        });
      });

      expect(innerRan).toBe(true);
      expect(transactionCalls).toBe(1); // EXACTLY 1 TRANSACTION OPENED!
      expect(mockDbState.jobs[0].title).toBe("Updated Job Title");
      expect(mockDbState.candidates.length).toBe(1);
    });

    it("Test 2: Nested transaction failure rolls back both parent and child operations", async () => {
      await expect(
        mockPrisma.transaction(async (tx1: PrismaService) => {
          await tx1.job.update({
            where: { id: "job-1" },
            data: { title: "Should Be Rolled Back" },
          });

          await mockPrisma.transaction(async (tx2: PrismaService) => {
            await tx2.candidate.create({
              data: {
                id: "cand-fail",
                organizationId: "org-1",
                name: "Cand Fail",
                email: "fail@test.com",
              },
            });
            throw new Error("Simulated Inner Business Failure");
          });
        }),
      ).rejects.toThrow("Simulated Inner Business Failure");

      expect(transactionCalls).toBe(1);
      expect(transactionRollbacks).toBe(1);
      // Both parent (Job title) and child (Candidate) must be rolled back!
      expect(mockDbState.jobs[0].title).toBe("Senior Backend Engineer");
      expect(mockDbState.candidates.length).toBe(0);
    });

    it("Test 3: Concurrent transactions (non-nested) create separate isolated transactions", async () => {
      const p1 = mockPrisma.transaction(async (tx1: PrismaService) => {
        await tx1.candidate.create({
          data: {
            id: "cand-concurrent-1",
            organizationId: "org-1",
            name: "Concurrent 1",
            email: "c1@test.com",
          },
        });
      });

      const p2 = mockPrisma.transaction(async (tx2: PrismaService) => {
        await tx2.candidate.create({
          data: {
            id: "cand-concurrent-2",
            organizationId: "org-1",
            name: "Concurrent 2",
            email: "c2@test.com",
          },
        });
      });

      await Promise.all([p1, p2]);

      expect(transactionCalls).toBe(2); // Exactly 2 separate transactions!
      expect(mockDbState.candidates.length).toBe(2);
    });
  });
});
