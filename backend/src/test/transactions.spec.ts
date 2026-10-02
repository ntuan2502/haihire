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

type QueryPredicate = (record: Record<string, { eq: (val: string) => boolean }>) => boolean;

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
  let createDbInterface: (stateRef: MockDbState) => typeof mockPrisma.db;

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
        { id: "mem-1", organizationId: "org-1", userId: "user-owner", role: "ADMIN" },
        { id: "mem-2", organizationId: "org-1", userId: "user-member", role: "MEMBER" },
      ],
      orgs: [
        { id: "org-1", name: "Acme Corp", slug: "acme", ownerId: "user-owner" },
      ],
      interviews: [],
    };

    createDbInterface = (stateRef: MockDbState) => ({
      orm: {
        public: {
          Job: {
            select: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
                first: vi.fn().mockImplementation(async () => {
                  return stateRef.jobs.find((j) => pred({ id: { eq: (id: string) => j.id === id } }));
                }),
              })),
            })),
            where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
              update: vi.fn().mockImplementation(async (updates: Record<string, unknown>) => {
                const job = stateRef.jobs.find((j) => pred({ id: { eq: (id: string) => j.id === id } }));
                if (job) Object.assign(job, updates);
                return job;
              }),
            })),
          },
          Candidate: {
            select: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
                where: vi.fn().mockImplementation((pred2: QueryPredicate) => ({
                  first: vi.fn().mockImplementation(async () => {
                    return stateRef.candidates.find(
                      (c) =>
                        pred({ organizationId: { eq: (id: string) => c.organizationId === id } }) &&
                        pred2({ email: { eq: (email: string) => c.email === email } }),
                    );
                  }),
                })),
                first: vi.fn().mockImplementation(async () => {
                  return stateRef.candidates.find((c) => pred({ id: { eq: (id: string) => c.id === id } }));
                }),
              })),
            })),
            create: vi.fn().mockImplementation(async (data: MockCandidate) => {
              stateRef.candidates.push(data);
              return data;
            }),
            where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
              update: vi.fn().mockImplementation(async (updates: Record<string, unknown>) => {
                const cand = stateRef.candidates.find((c) => pred({ id: { eq: (id: string) => c.id === id } }));
                if (cand) Object.assign(cand, updates);
                return cand;
              }),
            })),
          },
          Application: {
            select: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
                where: vi.fn().mockImplementation((pred2: QueryPredicate) => ({
                  first: vi.fn().mockImplementation(async () => {
                    return stateRef.applications.find(
                      (a) =>
                        pred({ candidateId: { eq: (id: string) => a.candidateId === id } }) &&
                        pred2({ jobId: { eq: (id: string) => a.jobId === id } }),
                    );
                  }),
                })),
                all: vi.fn().mockImplementation(async () => {
                  return stateRef.applications.filter((a) => pred({ jobId: { eq: (id: string) => a.jobId === id } }));
                }),
                first: vi.fn().mockImplementation(async () => {
                  return stateRef.applications.find((a) => pred({ id: { eq: (id: string) => a.id === id } }));
                }),
              })),
            })),
            create: vi.fn().mockImplementation(async (data: MockApplication) => {
              stateRef.applications.push(data);
              return data;
            }),
            where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
              delete: vi.fn().mockImplementation(async () => {
                const initialLen = stateRef.applications.length;
                stateRef.applications = stateRef.applications.filter(
                  (a) => !pred({ id: { eq: (id: string) => a.id === id } }),
                );
                return { count: initialLen - stateRef.applications.length };
              }),
            })),
          },
          Interview: {
            where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
              all: vi.fn().mockResolvedValue([]),
              delete: vi.fn().mockImplementation(async () => {
                stateRef.interviews = stateRef.interviews.filter(
                  (i) => !pred({ applicationId: { eq: (id: string) => i.applicationId === id } }),
                );
                return { count: 0 };
              }),
            })),
          },
          TrackingLink: {
            select: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation(() => ({
                first: vi.fn().mockResolvedValue(null),
              })),
            })),
          },
          User: {
            select: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
                first: vi.fn().mockImplementation(async () => {
                  return stateRef.users.find((u) => pred({ id: { eq: (id: string) => u.id === id } }));
                }),
              })),
            })),
            where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
              update: vi.fn().mockImplementation(async (updates: Record<string, unknown>) => {
                const matched = stateRef.users.filter((u) =>
                  pred({
                    organizationId: { eq: (id: string) => u.organizationId === id },
                    id: { eq: (id: string) => u.id === id },
                  }),
                );
                for (const u of matched) Object.assign(u, updates);
                return { count: matched.length };
              }),
            })),
          },
          OrganizationMember: {
            where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
              delete: vi.fn().mockImplementation(async () => {
                const initial = stateRef.members.length;
                stateRef.members = stateRef.members.filter(
                  (m) => !pred({ organizationId: { eq: (id: string) => m.organizationId === id } }),
                );
                return { count: initial - stateRef.members.length };
              }),
            })),
          },
          Organization: {
            select: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
                first: vi.fn().mockImplementation(async () => {
                  return stateRef.orgs.find((o) => pred({ id: { eq: (id: string) => o.id === id } }));
                }),
              })),
            })),
            where: vi.fn().mockImplementation((pred: QueryPredicate) => ({
              delete: vi.fn().mockImplementation(async () => {
                const initial = stateRef.orgs.length;
                stateRef.orgs = stateRef.orgs.filter(
                  (o) => !pred({ id: { eq: (id: string) => o.id === id } }),
                );
                return { count: initial - stateRef.orgs.length };
              }),
            })),
          },
        },
      },
    }) as unknown as typeof mockPrisma.db;

    const realDb = createDbInterface(mockDbState);
    const als = new AsyncLocalStorage<typeof realDb>();

    // Mock prisma with atomic transaction rollback simulation and ALS propagation
    mockPrisma = {
      db: realDb,
      client: realDb,
      transaction: vi.fn().mockImplementation(async (txFn: (tx: typeof realDb) => Promise<unknown>) => {
        const existing = als.getStore();
        if (existing) {
          return txFn(existing);
        }

        transactionCalls++;
        // Create an isolated snapshot of state to simulate transaction atomicity & rollback
        const snapshot = JSON.parse(JSON.stringify(mockDbState)) as MockDbState;
        const txDb = createDbInterface(snapshot);

        try {
          const result = await als.run(txDb, () => txFn(txDb));
          // If transaction commits, merge changes into real state
          for (const c of snapshot.candidates) {
            const idx = mockDbState.candidates.findIndex((x) => x.id === c.id);
            if (idx >= 0) Object.assign(mockDbState.candidates[idx], c);
            else mockDbState.candidates.push(c);
          }
          for (const a of snapshot.applications) {
            const idx = mockDbState.applications.findIndex((x) => x.id === a.id);
            if (idx >= 0) Object.assign(mockDbState.applications[idx], a);
            else mockDbState.applications.push(a);
          }
          if (snapshot.applications.length < mockDbState.applications.length) {
            mockDbState.applications = mockDbState.applications.filter((a) =>
              snapshot.applications.some((s) => s.id === a.id),
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
          // Rollback: snapshot is discarded, real state is unchanged!
          transactionRollbacks++;
          throw err;
        }
      }),
      executeTx: vi.fn().mockImplementation(async (txFn: (tx: typeof realDb) => Promise<unknown>) => {
        return mockPrisma.transaction(txFn);
      }),
    } as unknown as PrismaService;

    mockMinio = {
      uploadFile: vi.fn().mockImplementation(async (_file: Express.Multer.File, folder: string, orgId: string) => {
        const fileName = `tenants/${orgId}/${folder}/test-resume.pdf`;
        minioUploadedFiles.push(fileName);
        return {
          url: `http://minio:9000/haihire-resumes/${fileName}`,
          fileName,
          originalName: "test-resume.pdf",
          size: 1024,
          mimeType: "application/pdf",
        };
      }),
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
      (mockPrisma as unknown as { transaction: ReturnType<typeof vi.fn> }).transaction.mockImplementationOnce(
        async (txFn: (tx: typeof mockPrisma.db) => Promise<unknown>) => {
          transactionCalls++;
          const snapshot = JSON.parse(JSON.stringify(mockDbState)) as MockDbState;
          const txDb = createDbInterface(snapshot);
          txDb.orm.public.Application.create = vi.fn().mockRejectedValue(new Error("Simulated DB Crash on Application write"));
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
      expect(mockDbState.users.every((u) => u.organizationId === null)).toBe(true);
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
      await mockPrisma.transaction(async (tx1) => {
        // First level mutation
        await tx1.orm.public.Job.where((j) => j.id.eq("job-1")).update({ title: "Updated Job Title" });

        // Nested call simulates another service calling executeTx / transaction
        await mockPrisma.transaction(async (tx2) => {
          expect(tx2).toBe(tx1); // REUSED EXACT SAME CONTEXT
          await tx2.orm.public.Candidate.create({
            id: "cand-nested",
            organizationId: "org-1",
            name: "Nested Cand",
            email: "nested@test.com",
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
        mockPrisma.transaction(async (tx1) => {
          await tx1.orm.public.Job.where((j) => j.id.eq("job-1")).update({ title: "Should Be Rolled Back" });

          await mockPrisma.transaction(async (tx2) => {
            await tx2.orm.public.Candidate.create({
              id: "cand-fail",
              organizationId: "org-1",
              name: "Cand Fail",
              email: "fail@test.com",
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
      const p1 = mockPrisma.transaction(async (tx1) => {
        await tx1.orm.public.Candidate.create({
          id: "cand-concurrent-1",
          organizationId: "org-1",
          name: "Concurrent 1",
          email: "c1@test.com",
        });
      });

      const p2 = mockPrisma.transaction(async (tx2) => {
        await tx2.orm.public.Candidate.create({
          id: "cand-concurrent-2",
          organizationId: "org-1",
          name: "Concurrent 2",
          email: "c2@test.com",
        });
      });

      await Promise.all([p1, p2]);

      expect(transactionCalls).toBe(2); // Exactly 2 separate transactions!
      expect(mockDbState.candidates.length).toBe(2);
    });
  });
});
