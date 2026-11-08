import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApplicationsService } from "../applications/applications.service";
import {
  OrphanCleanupProcessor,
  ORPHAN_CLEANUP_QUEUE,
  ORPHAN_CLEANUP_DLQ,
  type OrphanCleanupJobData,
} from "../applications/orphan-cleanup.processor";
import { cleanupOrphans } from "../common/orphan-cleanup";
import type { Job, Queue } from "bullmq";
import * as Minio from "minio";
import type { db } from "../prisma/db";
import type { PrismaService } from "../prisma/prisma.service";
import type { MinioService } from "../minio/minio.service";
import type { ActivitiesService } from "../activities/activities.service";
import type { EmailService } from "../email/email.service";
import type { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";

describe("MinIO Compensating DLQ & Orphan File Cleanup Verification (Phase 17 Items 2 & 3)", () => {
  describe("Item 2 — MinIO Compensating DLQ Queue & Worker", () => {
    let mockPrisma: PrismaService & { transaction: ReturnType<typeof vi.fn> };
    let mockMinio: MinioService & {
      uploadFile: ReturnType<typeof vi.fn>;
      deleteFile: ReturnType<typeof vi.fn>;
      extractObjectName: ReturnType<typeof vi.fn>;
    };
    let mockActivities: ActivitiesService & {
      createActivity: ReturnType<typeof vi.fn>;
    };
    let mockEmail: EmailService & {
      getTemplateByType: ReturnType<typeof vi.fn>;
      sendEmail: ReturnType<typeof vi.fn>;
    };
    let mockQueue: Queue;
    let mockDlq: Queue;
    let enqueuedJobs: Array<{
      name: string;
      data: OrphanCleanupJobData;
      opts?: { attempts?: number; backoff?: { type?: string; delay?: number } };
    }>;
    let dlqJobs: Array<{
      name: string;
      data: { objectName?: string; finalError?: string; totalAttempts?: number };
    }>;

    beforeEach(() => {
      enqueuedJobs = [];
      dlqJobs = [];

      mockQueue = {
        name: ORPHAN_CLEANUP_QUEUE,
        add: vi.fn().mockImplementation(async (name: string, data: OrphanCleanupJobData, opts?: { attempts?: number; backoff?: { type?: string; delay?: number } }) => {
          enqueuedJobs.push({ name, data, opts });
          return { id: "job-123" } as Job;
        }),
      } as unknown as Queue;

      mockDlq = {
        name: ORPHAN_CLEANUP_DLQ,
        add: vi.fn().mockImplementation(async (name: string, data: { objectName?: string; finalError?: string; totalAttempts?: number }) => {
          dlqJobs.push({ name, data });
          return { id: "dlq-123" } as Job;
        }),
      } as unknown as Queue;

      const mockDb = {
        orm: {
          public: {
            Job: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  first: vi.fn().mockResolvedValue({
                    id: "job-1",
                    title: "Senior Engineer",
                    organizationId: "org-1",
                    status: "PUBLISHED",
                  }),
                }),
              }),
            },
            Candidate: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  first: vi.fn().mockResolvedValue(null),
                }),
              }),
              create: vi.fn().mockResolvedValue({
                id: "cand-1",
                name: "John",
                email: "john@test.com",
                organizationId: "org-1",
              }),
            },
            CandidateDocument: {
              create: vi.fn().mockResolvedValue({ id: "doc-1" }),
            },
            Application: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([]),
                  first: vi.fn().mockResolvedValue(null),
                }),
              }),
              create: vi.fn().mockResolvedValue({
                id: "app-1",
                candidateId: "cand-1",
                jobId: "job-1",
                stage: "APPLIED",
              }),
            },
          },
        },
      };

      mockPrisma = {
        db: mockDb,
        client: mockDb,
        transaction: vi.fn(),
        executeTx: vi.fn(),
      } as unknown as PrismaService & { transaction: ReturnType<typeof vi.fn> };

      mockMinio = {
        uploadFile: vi.fn().mockResolvedValue({
          fileName: "tenants/org-1/resumes/test.pdf",
          url: "http://minio:9000/haihire-resumes/tenants/org-1/resumes/test.pdf",
          originalName: "cv.pdf",
          size: 1024,
          mimeType: "application/pdf",
        }),
        deleteFile: vi.fn().mockResolvedValue(undefined),
        extractObjectName: vi.fn().mockReturnValue("tenants/org-1/resumes/test.pdf"),
      } as unknown as MinioService & {
        uploadFile: ReturnType<typeof vi.fn>;
        deleteFile: ReturnType<typeof vi.fn>;
        extractObjectName: ReturnType<typeof vi.fn>;
      };

      mockActivities = {
        createActivity: vi.fn().mockResolvedValue({}),
      } as unknown as ActivitiesService & {
        createActivity: ReturnType<typeof vi.fn>;
      };

      mockEmail = {
        getTemplateByType: vi.fn().mockResolvedValue(null),
        sendEmail: vi.fn().mockResolvedValue({}),
      } as unknown as EmailService & {
        getTemplateByType: ReturnType<typeof vi.fn>;
        sendEmail: ReturnType<typeof vi.fn>;
      };
    });

    it("Test 1: When compensating delete succeeds, orphan queue remains empty", async () => {
      const appService = new ApplicationsService(
        mockPrisma,
        mockMinio,
        mockActivities,
        mockEmail,
        mockQueue,
      );

      // Simulate DB transaction crash
      mockPrisma.transaction.mockRejectedValueOnce(new Error("DB Constraint Crash"));

      const mockFile = {
        fieldname: "resume",
        originalname: "cv.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        size: 1024,
        buffer: Buffer.from("%PDF-1.4 valid test cv content\n%%EOF"),
      } as Express.Multer.File;

      await expect(
        appService.create(
          { jobId: "job-1", candidateName: "John", candidateEmail: "john@test.com" },
          mockFile,
        ),
      ).rejects.toThrow("DB Constraint Crash");

      // Verify normal compensating delete succeeded
      expect(mockMinio.deleteFile).toHaveBeenCalledWith("tenants/org-1/resumes/test.pdf");
      // Queue must remain completely empty!
      expect(enqueuedJobs.length).toBe(0);
    });

    it("Test 2: When compensating delete fails (MinIO down), file is pushed to DLQ queue with 5 attempts", async () => {
      const appService = new ApplicationsService(
        mockPrisma,
        mockMinio,
        mockActivities,
        mockEmail,
        mockQueue,
      );

      // Simulate DB transaction crash AND MinIO network failure during compensating action
      mockPrisma.transaction.mockRejectedValueOnce(new Error("DB Constraint Crash"));
      mockMinio.deleteFile.mockRejectedValueOnce(new Error("MinIO Connection Refused (503 Service Unavailable)"));

      const mockFile = {
        fieldname: "resume",
        originalname: "cv.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        size: 1024,
        buffer: Buffer.from("%PDF-1.4 valid test cv content\n%%EOF"),
      } as Express.Multer.File;

      await expect(
        appService.create(
          { jobId: "job-1", candidateName: "John", candidateEmail: "john@test.com" },
          mockFile,
        ),
      ).rejects.toThrow("DB Constraint Crash");

      // Verify delete was attempted
      expect(mockMinio.deleteFile).toHaveBeenCalledWith("tenants/org-1/resumes/test.pdf");
      // Enqueued to cleanup queue with retry parameters!
      expect(enqueuedJobs.length).toBe(1);
      expect(enqueuedJobs[0].name).toBe("cleanup");
      expect(enqueuedJobs[0].data.objectName).toBe("tenants/org-1/resumes/test.pdf");
      expect(enqueuedJobs[0].data.reason).toBe("transaction-rollback-compensation-failed");
      expect(enqueuedJobs[0].data.originalError).toContain("MinIO Connection Refused");
      expect(enqueuedJobs[0].opts?.attempts).toBe(5);
      expect(enqueuedJobs[0].opts?.backoff?.type).toBe("exponential");
    });

    it("Test 3: Worker retry process — retry succeeds on attempt 2", async () => {
      const processor = new OrphanCleanupProcessor(mockMinio, mockDlq);

      // Attempt 1 fails, attempt 2 succeeds
      mockMinio.deleteFile.mockRejectedValueOnce(new Error("Temporary MinIO Timeout"));

      const mockJobFail = {
        id: "job-1",
        data: { objectName: "tenants/org-1/resumes/failed-cv.pdf" },
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as unknown as Job<OrphanCleanupJobData>;

      await expect(processor.process(mockJobFail)).rejects.toThrow("Temporary MinIO Timeout");

      // Attempt 2 succeeds
      mockMinio.deleteFile.mockResolvedValueOnce(undefined);
      const mockJobSuccess = {
        id: "job-1",
        data: { objectName: "tenants/org-1/resumes/failed-cv.pdf" },
        attemptsMade: 1,
        opts: { attempts: 5 },
      } as unknown as Job<OrphanCleanupJobData>;

      const result = await processor.process(mockJobSuccess);
      expect(result.success).toBe(true);
      expect(result.objectName).toBe("tenants/org-1/resumes/failed-cv.pdf");
    });

    it("Test 4: Worker terminal failure — after 5 attempts, moves to Dead-Letter Queue (DLQ) & alerts via WebhookNotifier", async () => {
      const mockWebhookNotifier = {
        notifyDlq: vi.fn().mockResolvedValue(undefined),
      } as unknown as WebhookNotifierService;

      const processor = new OrphanCleanupProcessor(mockMinio, mockDlq, mockWebhookNotifier);

      const terminalJob = {
        id: "job-perm-fail",
        name: "cleanup",
        data: {
          objectName: "tenants/org-1/resumes/permanent-orphan.pdf",
          reason: "transaction-rollback-compensation-failed",
          organizationId: "org-1",
        },
        attemptsMade: 5,
        opts: { attempts: 5 },
      } as unknown as Job<OrphanCleanupJobData>;

      await processor.onFailed(terminalJob, new Error("Bucket Does Not Exist"));

      // 1. Verify enqueued into Dead-Letter Queue
      expect(dlqJobs.length).toBe(1);
      expect(dlqJobs[0].name).toBe("dead-letter-cleanup");
      expect(dlqJobs[0].data.objectName).toBe("tenants/org-1/resumes/permanent-orphan.pdf");
      expect(dlqJobs[0].data.finalError).toBe("Bucket Does Not Exist");
      expect(dlqJobs[0].data.totalAttempts).toBe(5);

      // 2. Verify Webhook alert was dispatched with full diagnostic context
      expect(mockWebhookNotifier.notifyDlq).toHaveBeenCalledTimes(1);
      expect(mockWebhookNotifier.notifyDlq).toHaveBeenCalledWith(
        {
          queue: "orphan-cleanup-dlq",
          jobName: "cleanup",
          objectName: "tenants/org-1/resumes/permanent-orphan.pdf",
          reason: "transaction-rollback-compensation-failed",
          attemptsMade: 5,
          errorMessage: "Bucket Does Not Exist",
          timestamp: expect.any(String),
        },
        "org-1",
      );
    });

    it("Test 4b: Worker intermediate retry failure (< 5 attempts) does not trigger DLQ Webhook alert", async () => {
      const mockWebhookNotifier = {
        notifyDlq: vi.fn().mockResolvedValue(undefined),
      } as unknown as WebhookNotifierService;

      const processor = new OrphanCleanupProcessor(mockMinio, mockDlq, mockWebhookNotifier);

      const retryJob = {
        id: "job-retry",
        name: "cleanup",
        data: {
          objectName: "tenants/org-1/resumes/retry-orphan.pdf",
          reason: "transaction-rollback-compensation-failed",
        },
        attemptsMade: 3,
        opts: { attempts: 5 },
      } as unknown as Job<OrphanCleanupJobData>;

      await processor.onFailed(retryJob, new Error("Temporary S3 Socket Timeout"));

      expect(dlqJobs.length).toBe(0);
      expect(mockWebhookNotifier.notifyDlq).not.toHaveBeenCalled();
    });
  });

  describe("Item 3 — Orphan File Cleanup Cron Script", () => {
    it("Test 5: Full scan correctly identifies orphans, deletes files older than 30 days, preserves files within grace period", async () => {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      // 5 files on MinIO:
      // - active-1: referenced in CandidateDocument (10 days old) -> KEEP
      // - active-2: referenced in Application (40 days old) -> KEEP
      // - active-3: referenced in Candidate (2 days old) -> KEEP
      // - orphan-old: no reference, 45 days old -> DELETE
      // - orphan-new: no reference, 5 days old -> KEEP (grace period)
      const mockMinioObjects = [
        { name: "tenants/org-1/resumes/active-1.pdf", size: 1000, lastModified: new Date(now - 10 * DAY_MS) },
        { name: "tenants/org-1/resumes/active-2.pdf", size: 2000, lastModified: new Date(now - 40 * DAY_MS) },
        { name: "tenants/org-1/resumes/active-3.pdf", size: 3000, lastModified: new Date(now - 2 * DAY_MS) },
        { name: "tenants/org-1/resumes/orphan-old.pdf", size: 5000, lastModified: new Date(now - 45 * DAY_MS) },
        { name: "tenants/org-1/resumes/orphan-new.pdf", size: 4000, lastModified: new Date(now - 5 * DAY_MS) },
      ];

      const deletedFromMinio: string[] = [];

      const mockMinioClient = {
        listObjects: vi.fn().mockImplementation(() => {
          const listeners: Record<string, (arg?: unknown) => void> = {};
          const stream = {
            on: (event: string, handler: (arg?: unknown) => void) => {
              listeners[event] = handler;
              return stream;
            },
          };
          setTimeout(() => {
            for (const obj of mockMinioObjects) {
              listeners["data"]?.(obj);
            }
            listeners["end"]?.();
          }, 5);
          return stream;
        }),
        removeObject: vi.fn().mockImplementation(async (_bucket: string, objectName: string) => {
          deletedFromMinio.push(objectName);
        }),
      } as unknown as Minio.Client;

      const mockDb = {
        orm: {
          public: {
            CandidateDocument: {
              select: vi.fn().mockReturnValue({
                all: vi.fn().mockResolvedValue([
                  { url: "http://minio:9000/haihire-resumes/tenants/org-1/resumes/active-1.pdf" },
                ]),
              }),
            },
            Application: {
              select: vi.fn().mockReturnValue({
                all: vi.fn().mockResolvedValue([
                  { resumeUrl: "http://minio:9000/haihire-resumes/tenants/org-1/resumes/active-2.pdf" },
                ]),
              }),
            },
            Candidate: {
              select: vi.fn().mockReturnValue({
                all: vi.fn().mockResolvedValue([
                  { resumeUrl: "http://minio:9000/haihire-resumes/tenants/org-1/resumes/active-3.pdf" },
                ]),
              }),
            },
          },
        },
      } as unknown as typeof db;

      const report = await cleanupOrphans({
        dryRun: false,
        thresholdDays: 30,
        minioClient: mockMinioClient,
        dbClient: mockDb,
      });

      expect(report.scannedCount).toBe(5);
      expect(report.dbRefCount).toBe(3);
      expect(report.orphanCount).toBe(2);
      expect(report.preservedGraceCount).toBe(1);
      expect(report.deletedCount).toBe(1);
      expect(report.bytesFreed).toBe(5000);

      // Verify file lists
      expect(report.preservedFiles).toEqual(["tenants/org-1/resumes/orphan-new.pdf"]);
      expect(report.deletedFiles).toEqual(["tenants/org-1/resumes/orphan-old.pdf"]);
      expect(deletedFromMinio).toEqual(["tenants/org-1/resumes/orphan-old.pdf"]);
    });

    it("Test 6: Dry-run mode simulates deletion without deleting any files from MinIO", async () => {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      const mockMinioObjects = [
        { name: "tenants/org-1/resumes/orphan-old.pdf", size: 8000, lastModified: new Date(now - 60 * DAY_MS) },
      ];

      const deletedFromMinio: string[] = [];

      const mockMinioClient = {
        listObjects: vi.fn().mockImplementation(() => {
          const listeners: Record<string, (arg?: unknown) => void> = {};
          const stream = {
            on: (event: string, handler: (arg?: unknown) => void) => {
              listeners[event] = handler;
              return stream;
            },
          };
          setTimeout(() => {
            for (const obj of mockMinioObjects) {
              listeners["data"]?.(obj);
            }
            listeners["end"]?.();
          }, 5);
          return stream;
        }),
        removeObject: vi.fn().mockImplementation(async (_bucket: string, objectName: string) => {
          deletedFromMinio.push(objectName);
        }),
      } as unknown as Minio.Client;

      const mockDb = {
        orm: {
          public: {
            CandidateDocument: { select: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue([]) }) },
            Application: { select: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue([]) }) },
            Candidate: { select: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue([]) }) },
          },
        },
      } as unknown as typeof db;

      const report = await cleanupOrphans({
        dryRun: true, // DRY-RUN ACTIVE
        thresholdDays: 30,
        minioClient: mockMinioClient,
        dbClient: mockDb,
      });

      expect(report.orphanCount).toBe(1);
      expect(report.deletedCount).toBe(1);
      expect(report.bytesFreed).toBe(8000);
      // MinIO removeObject must NEVER be called in dry-run mode!
      expect(deletedFromMinio.length).toBe(0);
      expect(mockMinioClient.removeObject).not.toHaveBeenCalled();
    });
  });
});
