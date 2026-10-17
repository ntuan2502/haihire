import { describe, expect, it, vi, beforeEach } from "vitest";
import { APP_ERROR_CODES, SourcingChannel } from "@haihire/shared";
import { ApplicationsSagaService } from "./applications-saga.service";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
  AppConflictException,
} from "../../common/app-exception";
import {
  createMockTable,
  MockTable,
} from "../../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MinioService } from "../../minio/minio.service";
import type { ActivitiesService } from "../../activities/activities.service";
import type { EmailService } from "../../email/email.service";
import type { ApplicationsQueryService } from "./applications-query.service";
import type { Queue } from "bullmq";

describe("ApplicationsSagaService", () => {
  let service: ApplicationsSagaService;

  let jobTable: MockTable<Record<string, unknown>>;
  let candidateTable: MockTable<Record<string, unknown>>;
  let applicationTable: MockTable<Record<string, unknown>>;
  let trackingLinkTable: MockTable<Record<string, unknown>>;
  let organizationTable: MockTable<Record<string, unknown>>;

  let mockPrisma: PrismaService;
  let mockMinio: Partial<MinioService>;
  let mockActivities: Partial<ActivitiesService>;
  let mockEmail: Partial<EmailService>;
  let mockQueue: Partial<Queue>;
  let mockQuery: Partial<ApplicationsQueryService>;

  beforeEach(() => {
    jobTable = createMockTable([
      {
        id: "job-1",
        title: "Senior Backend Engineer",
        status: "PUBLISHED",
        organizationId: "org-1",
        department: "Engineering",
        location: "Remote",
      },
      {
        id: "job-draft",
        title: "Draft Job",
        status: "DRAFT",
        organizationId: "org-1",
      },
      {
        id: "job-no-org",
        title: "Orphan Job",
        status: "PUBLISHED",
        organizationId: null,
      },
    ]);

    candidateTable = createMockTable([
      {
        id: "cand-existing",
        name: "Existing Candidate",
        email: "existing@example.com",
        organizationId: "org-1",
      },
      {
        id: "cand-diff-org",
        name: "Different Org Candidate",
        email: "diff@example.com",
        organizationId: "org-other",
      },
    ]);

    applicationTable = createMockTable([]);
    trackingLinkTable = createMockTable([
      {
        id: "link-1",
        token: "ref-linkedin",
        organizationId: "org-1",
        source: SourcingChannel.LINKEDIN,
        customSource: "linkedin-post",
        campaign: "q4-hiring",
        isActive: true,
        deletedAt: null,
      },
      {
        id: "link-inactive",
        token: "ref-inactive",
        organizationId: "org-1",
        source: SourcingChannel.OTHER,
        isActive: false,
        deletedAt: null,
      },
      {
        id: "link-diff-org",
        token: "ref-other-org",
        organizationId: "org-other",
        source: SourcingChannel.REFERRAL,
        isActive: true,
        deletedAt: null,
      },
    ]);

    organizationTable = createMockTable([
      {
        id: "org-1",
        name: "Acme Corp",
      },
    ]);

    const mockOrm = {
      public: {
        Job: jobTable,
        Candidate: candidateTable,
        Application: applicationTable,
        TrackingLink: trackingLinkTable,
        Organization: organizationTable,
      },
    };

    const mockDb = {
      orm: mockOrm,
    };

    mockPrisma = {
      db: mockDb,
      executeTx: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockDb),
      ),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockDb),
      ),
    } as unknown as PrismaService;

    mockMinio = {
      uploadFile: vi.fn().mockResolvedValue({
        url: "https://minio.local/resumes/uploaded-resume.pdf",
        originalName: "uploaded-resume.pdf",
        fileName: "resumes/uploaded-resume.pdf",
        size: 1024,
        mimeType: "application/pdf",
      }),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      extractObjectName: vi.fn((url: string) =>
        url.replace("https://minio.local/", ""),
      ),
    };

    mockActivities = {
      createActivity: vi
        .fn()
        .mockResolvedValue({ id: "act-1" } as unknown as never),
    };

    mockEmail = {
      getTemplateByType: vi.fn().mockResolvedValue({
        enabled: true,
        subject: "Application Confirmation: {{jobTitle}}",
        body: "Hello {{candidateName}}, thank you for applying!",
      } as unknown as never),
      sendEmail: vi.fn().mockResolvedValue(undefined as unknown as never),
    };

    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: "dlq-1" } as unknown as never),
    };

    mockQuery = {
      findOne: vi.fn().mockImplementation(async (id: string) => {
        const app = applicationTable.store.find((a) => a.id === id);
        const cand = candidateTable.store.find(
          (c) => c.id === app?.candidateId,
        );
        return {
          id,
          ...app,
          candidate: cand || {
            id: "cand-new",
            name: "New Candidate",
            email: "new@example.com",
          },
        };
      }),
    };

    service = new ApplicationsSagaService(
      mockPrisma,
      mockMinio as MinioService,
      mockActivities as ActivitiesService,
      mockEmail as EmailService,
      mockQueue as Queue,
      mockQuery as ApplicationsQueryService,
    );
  });

  describe("Group 1: Pre-condition & RBAC", () => {
    it("throws AppForbiddenException when current user has MEMBER role", async () => {
      await expect(
        service.create(
          {
            jobId: "job-1",
            candidateName: "Test",
            candidateEmail: "test@example.com",
          },
          undefined,
          { role: "MEMBER" },
        ),
      ).rejects.toThrow(AppForbiddenException);
    });

    it("throws AppBadRequestException when jobId is missing", async () => {
      await expect(
        service.create(
          {
            jobId: "",
            candidateName: "Test",
            candidateEmail: "test@example.com",
          },
          undefined,
          { role: "ADMIN" },
        ),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("throws AppNotFoundException when target job does not exist", async () => {
      await expect(
        service.create(
          {
            jobId: "job-999",
            candidateName: "Test",
            candidateEmail: "test@example.com",
          },
          undefined,
          { role: "ADMIN" },
        ),
      ).rejects.toThrow(AppNotFoundException);
    });

    it("throws AppBadRequestException when job is not published", async () => {
      await expect(
        service.create(
          {
            jobId: "job-draft",
            candidateName: "Test",
            candidateEmail: "test@example.com",
          },
          undefined,
          { role: "ADMIN" },
        ),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
      });
    });

    it("throws AppBadRequestException when target job has no organizationId", async () => {
      await expect(
        service.create(
          {
            jobId: "job-no-org",
            candidateName: "Test",
            candidateEmail: "test@example.com",
          },
          undefined,
          { role: "ADMIN" },
        ),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
      });
    });
  });

  describe("Group 2: Resume & Candidate Options", () => {
    it("handles direct resumeUrl without Multer file upload", async () => {
      const result = await service.create({
        jobId: "job-1",
        candidateName: "Resume URL Candidate",
        candidateEmail: "direct-url@example.com",
        resumeUrl: "https://external.s3.com/my-cv.pdf",
        resumeFileName: "my-cv.pdf",
      });

      expect(result).toBeDefined();
      expect(mockMinio.uploadFile).not.toHaveBeenCalled();
      const createdApp = applicationTable.store[0];
      expect(createdApp?.resumeUrl).toBe("https://external.s3.com/my-cv.pdf");
      expect(createdApp?.resumeFileName).toBe("my-cv.pdf");
    });

    it("reuses existing candidate when matching email is found in organization", async () => {
      const initialCandidateCount = candidateTable.store.length;

      const result = await service.create({
        jobId: "job-1",
        candidateName: "Existing Candidate Updated Name",
        candidateEmail: "existing@example.com",
      });

      expect(result).toBeDefined();
      expect(candidateTable.store.length).toBe(initialCandidateCount);
      const createdApp = applicationTable.store[0];
      expect(createdApp?.candidateId).toBe("cand-existing");
    });

    it("throws AppNotFoundException when provided candidateId does not exist", async () => {
      await expect(
        service.create({
          jobId: "job-1",
          candidateId: "non-existent-cand",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
      });
    });

    it("throws AppForbiddenException when provided candidate belongs to a different org", async () => {
      await expect(
        service.create({
          jobId: "job-1",
          candidateId: "cand-diff-org",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
      });
    });

    it("throws AppConflictException when candidate has already applied to this job", async () => {
      applicationTable.store.push({
        id: "app-prev",
        candidateId: "cand-existing",
        jobId: "job-1",
        stage: "APPLIED",
        orderIndex: 0,
      });

      await expect(
        service.create({
          jobId: "job-1",
          candidateId: "cand-existing",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.CANDIDATE_ALREADY_APPLIED,
      });
    });
  });

  describe("Group 3: Sourcing Attribution", () => {
    it("inherits UTM attributes and source channel from tracking link via dto.ref", async () => {
      const result = await service.create({
        jobId: "job-1",
        candidateName: "Attributed User",
        candidateEmail: "attr@example.com",
        ref: "ref-linkedin",
      });

      expect(result).toBeDefined();
      const createdApp = applicationTable.store[0];
      expect(createdApp?.trackingLinkId).toBe("link-1");
      expect(createdApp?.sourceChannel).toBe(SourcingChannel.LINKEDIN);
      expect(createdApp?.sourceDetails).toBe("linkedin-post");
      expect(createdApp?.utmCampaign).toBe("q4-hiring");
    });

    it("resolves sourceChannel from referrer domain heuristic when ref is absent", async () => {
      const testCases = [
        {
          referrer: "https://www.linkedin.com/jobs/view/123",
          expected: SourcingChannel.LINKEDIN,
        },
        {
          referrer: "https://indeed.com/viewjob",
          expected: SourcingChannel.INDEED,
        },
        {
          referrer: "https://careers.google.com/search",
          expected: SourcingChannel.GOOGLE_JOBS,
        },
        {
          referrer: "https://glassdoor.com/job",
          expected: SourcingChannel.GLASSDOOR,
        },
        {
          referrer: "https://facebook.com/share",
          expected: SourcingChannel.FACEBOOK,
        },
        {
          referrer: "https://twitter.com/post",
          expected: SourcingChannel.TWITTER_X,
        },
        {
          referrer: "https://reddit.com/r/recruiting",
          expected: SourcingChannel.REDDIT,
        },
        {
          referrer: "https://stackoverflow.com/jobs",
          expected: SourcingChannel.STACK_OVERFLOW,
        },
        {
          referrer: "https://joinhandshake.com/students",
          expected: SourcingChannel.HANDSHAKE,
        },
        {
          referrer: "https://myblog.tech/article",
          expected: SourcingChannel.OTHER,
        },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        if (!tc) continue;
        const result = await service.create({
          jobId: "job-1",
          candidateName: `Referrer User ${i}`,
          candidateEmail: `ref-${i}@example.com`,
          referrer: tc.referrer,
        });
        expect(result).toBeDefined();
        const createdApp = applicationTable.store.find(
          (a) =>
            a.candidateId !== "cand-existing" &&
            a.candidateId !== "cand-diff-org",
        );
        expect(createdApp?.sourceChannel).toBe(tc.expected);
        // Clear for next iteration
        applicationTable.store.length = 0;
      }
    });

    it("falls back to dto.sourceChannel when neither ref nor referrer is matched", async () => {
      const result = await service.create({
        jobId: "job-1",
        candidateName: "Direct Source User",
        candidateEmail: "direct-source@example.com",
        sourceChannel: SourcingChannel.CAREER_SITE,
      });

      expect(result).toBeDefined();
      const createdApp = applicationTable.store[0];
      expect(createdApp?.sourceChannel).toBe(SourcingChannel.CAREER_SITE);
    });
  });

  describe("Group 4: DLQ & Email Compensation", () => {
    it("enqueues file to DLQ with exponential backoff when MinIO rollback compensation fails", async () => {
      const fakeFile = {
        fieldname: "resume",
        originalname: "test-resume.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 sample content\n%%EOF"),
        size: 30,
      } as Express.Multer.File;

      // Force DB transaction failure
      (
        mockPrisma.transaction as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("Database deadlock error"));

      // Force MinIO delete compensation failure
      (mockMinio.deleteFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("MinIO network timeout"),
      );

      await expect(
        service.create(
          {
            jobId: "job-1",
            candidateName: "Rollback User",
            candidateEmail: "rb@example.com",
          },
          fakeFile,
        ),
      ).rejects.toThrow("Database deadlock error");

      expect(mockMinio.deleteFile).toHaveBeenCalledWith(
        "resumes/uploaded-resume.pdf",
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        "cleanup",
        expect.objectContaining({
          objectName: "resumes/uploaded-resume.pdf",
          reason: "transaction-rollback-compensation-failed",
          organizationId: "org-1",
        }),
        expect.objectContaining({
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        }),
      );
    });

    it("catches and logs queue error without suppressing the original database exception", async () => {
      const fakeFile = {
        fieldname: "resume",
        originalname: "test-resume.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 sample content\n%%EOF"),
        size: 30,
      } as Express.Multer.File;

      (
        mockPrisma.transaction as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("Database transaction aborted"));
      (mockMinio.deleteFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("MinIO delete failed"),
      );
      (mockQueue.add as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Redis connection refused on queue"),
      );

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        service.create(
          {
            jobId: "job-1",
            candidateName: "DLQ Err User",
            candidateEmail: "dlq@example.com",
          },
          fakeFile,
        ),
      ).rejects.toThrow("Database transaction aborted");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to enqueue orphan file to cleanup queue:",
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it("dispatches application confirmation email and catches transient email error safely", async () => {
      (mockEmail.sendEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("SMTP server connection timeout"),
      );
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await service.create({
        jobId: "job-1",
        candidateName: "Email User",
        candidateEmail: "email-user@example.com",
      });

      expect(result).toBeDefined();
      expect(mockEmail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.any(String),
          templateType: "APPLICATION_CONFIRMATION",
        }),
        "org-1",
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to send confirmation email:",
        expect.any(Error),
      );
      consoleWarnSpy.mockRestore();
    });
  });
});
