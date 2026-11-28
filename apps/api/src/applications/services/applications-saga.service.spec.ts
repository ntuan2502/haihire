import { describe, expect, it, vi, beforeEach } from "vitest";
import { Logger } from "@nestjs/common";
import { APP_ERROR_CODES, SourcingChannel } from "@haihire/shared";
import { ApplicationsSagaService } from "./applications-saga.service";
import { PublicApplyDto } from "../dto/public-apply.dto";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
  AppConflictException,
} from "../../common/app-exception";
import {
  createMockTable,
  createMockPrismaService,
  type MockTable,
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
      {
        id: "job-expired",
        title: "Expired Job",
        status: "PUBLISHED",
        applicationDeadline: new Date("2020-01-01T00:00:00.000Z"),
        organizationId: "org-1",
        department: "Engineering",
        location: "Remote",
      },
      {
        id: "job-future-deadline",
        title: "Future Deadline Job",
        status: "PUBLISHED",
        applicationDeadline: new Date("2099-12-31T00:00:00.000Z"),
        organizationId: "org-1",
        department: "Engineering",
        location: "Remote",
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

    const _mockDb = {
      orm: mockOrm,
    };

    mockPrisma = createMockPrismaService({
      job: jobTable,
      candidate: candidateTable,
      application: applicationTable,
      trackingLink: trackingLinkTable,
      organization: organizationTable,
    }) as unknown as PrismaService;
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

  it("returns only an acknowledgement for anonymous applications against existing candidates", async () => {
    Object.assign(candidateTable.store[0], {
      dateOfBirth: new Date("1990-01-01"),
      resumeUrl: "https://storage.example/private-resume.pdf",
      phone: "+84909998888",
    });
    const result = await service.create({
      jobId: "job-1",
      firstName: "Impersonator",
      lastName: "User",
      candidateEmail: "existing@example.com",
    });
    expect(Object.keys(result).sort()).toEqual([
      "createdAt",
      "id",
      "jobId",
      "stage",
    ]);
    expect(JSON.stringify(result)).not.toContain("+84909998888");
    expect(JSON.stringify(result)).not.toContain("1990-01-01");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("resumeUrl");
  });

  describe("Group 1: Pre-condition & RBAC", () => {
    it("throws AppForbiddenException when current user has MEMBER role", async () => {
      await expect(
        service.create(
          {
            jobId: "job-1",
            firstName: "Test",
            lastName: "User",
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
            firstName: "Test",
            lastName: "User",
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
            firstName: "Test",
            lastName: "User",
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
            firstName: "Test",
            lastName: "User",
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
            firstName: "Test",
            lastName: "User",
            candidateEmail: "test@example.com",
          },
          undefined,
          { role: "ADMIN" },
        ),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
      });
    });

    it("throws JOB_NOT_ACCEPTING_APPLICATIONS when applicationDeadline has passed and allows future deadlines", async () => {
      await expect(
        service.create({
          jobId: "job-expired",
          firstName: "Late",
          lastName: "Applicant",
          candidateEmail: "late@example.com",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
      });

      const created = await service.create({
        jobId: "job-future-deadline",
        firstName: "Timely",
        lastName: "Applicant",
        candidateEmail: "timely@example.com",
        resumeUrl: "https://external.s3.com/timely.pdf",
      });
      expect(created).toBeDefined();
    });
  });

  describe("Group 2: Resume & Candidate Options", () => {
    it("handles direct resumeUrl without Multer file upload", async () => {
      const result = await service.create({
        jobId: "job-1",
        firstName: "Resume URL",
        lastName: "Candidate",
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
        firstName: "Existing",
        lastName: "Candidate",
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
      ).rejects.toThrow(AppConflictException);
    });

    it("throws AppForbiddenException when resumeUrl belongs to another tenant (C-01)", async () => {
      await expect(
        service.create({
          jobId: "job-1",
          firstName: "Attacker",
          lastName: "User",
          candidateEmail: "attacker@test.local",
          resumeUrl: "https://minio.local/tenants/other-org/resumes/secret.pdf",
        }),
      ).rejects.toThrow("Cross-tenant resume reference is not permitted");
    });

    it("throws AppForbiddenException when reusing candidateId but referencing another resumeUrl (C-01)", async () => {
      candidateTable.store.push({
        id: "cand-with-cv",
        name: "Legit Candidate",
        email: "legit@example.com",
        organizationId: "org-1",
        resumeUrl: "https://minio.local/tenants/org-1/resumes/legit-cv.pdf",
      });

      await expect(
        service.create({
          jobId: "job-1",
          candidateId: "cand-with-cv",
          resumeUrl:
            "https://minio.local/tenants/org-1/resumes/tampered-cv.pdf",
        }),
      ).rejects.toThrow("Referenced resume does not belong to this candidate.");
    });
  });

  describe("Group 3: Sourcing Attribution", () => {
    it("inherits UTM attributes and source channel from tracking link via dto.ref", async () => {
      const result = await service.create({
        jobId: "job-1",
        firstName: "Attributed",
        lastName: "User",
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
          firstName: "Referrer",
          lastName: `User ${i}`,
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
        firstName: "Direct Source",
        lastName: "User",
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
            firstName: "Rollback",
            lastName: "User",
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

      const loggerErrorSpy = vi
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => {});

      await expect(
        service.create(
          {
            jobId: "job-1",
            firstName: "DLQ Err",
            lastName: "User",
            candidateEmail: "dlq@example.com",
          },
          fakeFile,
        ),
      ).rejects.toThrow("Database transaction aborted");

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to enqueue orphan file to cleanup queue:",
        ),
      );
      loggerErrorSpy.mockRestore();
    });

    it("dispatches application confirmation email and catches transient email error safely", async () => {
      (mockEmail.sendEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("SMTP server connection timeout"),
      );
      const loggerWarnSpy = vi
        .spyOn(Logger.prototype, "warn")
        .mockImplementation(() => {});

      const result = await service.create({
        jobId: "job-1",
        firstName: "Email",
        lastName: "User",
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
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send confirmation email:"),
      );
      loggerWarnSpy.mockRestore();
    });

    it("preserves organic referrer attribution for PublicApplyDto and allows authenticated Recruiter candidateId apply while stripping anonymous candidateId", async () => {
      const publicDto = Object.assign(new PublicApplyDto(), {
        jobId: "job-1",
        firstName: "Organic",
        lastName: "Candidate",
        candidateEmail: "organic@example.com",
        referrer: "https://www.linkedin.com/jobs/view/999",
        candidateId: "cand-existing",
      });

      await service.create(publicDto);
      const anonApp = applicationTable.store.find(
        (a) => a.sourceChannel === SourcingChannel.LINKEDIN,
      );
      expect(anonApp).toBeDefined();
      expect(anonApp?.candidateId).not.toBe("cand-existing");

      const internalDto = Object.assign(new PublicApplyDto(), {
        jobId: "job-1",
        candidateId: "cand-existing",
        candidateEmail: "existing@example.com",
      });
      const internalResult = await service.create(internalDto, undefined, {
        role: "RECRUITER",
        organizationId: "org-1",
      });
      expect(internalResult).toHaveProperty("candidate");
    });

    it("honors PermissionResolverService override granting application:create to MEMBER and maps P2002 to AppConflictException", async () => {
      const mockResolver = {
        resolvePermission: vi.fn().mockResolvedValue(true),
      };
      const sagaWithResolver = new ApplicationsSagaService(
        mockPrisma,
        mockMinio as unknown as MinioService,
        mockActivities as unknown as ActivitiesService,
        mockEmail as unknown as EmailService,
        mockQueue as unknown as Queue,
        mockQuery as unknown as ApplicationsQueryService,
        undefined,
        undefined,
        mockResolver as never,
      );

      const created = await sagaWithResolver.create(
        {
          jobId: "job-1",
          candidateId: "cand-existing",
        },
        undefined,
        { role: "MEMBER", organizationId: "org-1", isOwner: false },
      );
      expect(created).toBeDefined();
      expect(mockResolver.resolvePermission).toHaveBeenCalledWith(
        "org-1",
        "MEMBER",
        "application:create",
      );

      // P2002 unique violation inside transaction must map to AppConflictException
      vi.spyOn(mockPrisma.application, "create").mockRejectedValueOnce({
        code: "P2002",
      });
      await expect(
        sagaWithResolver.create(
          {
            jobId: "job-1",
            firstName: "Race",
            lastName: "Applicant",
            candidateEmail: "race@example.com",
          },
          undefined,
          { role: "ADMIN", organizationId: "org-1", isOwner: true },
        ),
      ).rejects.toBeInstanceOf(AppConflictException);
    });

    it("backfills empty candidate phone on returning apply without overwriting an existing non-empty phone", async () => {
      candidateTable.store[0].phone = null;
      await service.create({
        jobId: "job-1",
        firstName: "Existing",
        lastName: "Candidate",
        candidateEmail: "existing@example.com",
        candidatePhone: "0909888777",
      });
      expect(candidateTable.store[0].phone).toBe("0909888777");

      // Second job with a different phone submitted must preserve the existing non-empty phone
      await jobTable.create({
        id: "job-2",
        title: "Staff Frontend Engineer",
        status: "PUBLISHED",
        organizationId: "org-1",
      });
      await service.create({
        jobId: "job-2",
        firstName: "Existing",
        lastName: "Candidate",
        candidateEmail: "existing@example.com",
        candidatePhone: "0911222333",
      });
      expect(candidateTable.store[0].phone).toBe("0909888777");
    });

    it("enforces job applicationFormConfig requirements and persists coverLetter + screeningAnswers snapshot", async () => {
      await jobTable.create({
        id: "job-configured",
        title: "Frontend Architect",
        status: "PUBLISHED",
        organizationId: "org-1",
        applicationFormConfig: {
          phone: "required",
          resume: "optional",
          coverLetter: "required",
          screeningQuestions: [
            {
              id: "q-react",
              text: "Years of React experience?",
              type: "short_text",
              required: true,
            },
            {
              id: "q-remote",
              text: "Open to remote?",
              type: "yes_no",
              required: false,
            },
          ],
        },
      });

      // Missing required phone -> rejected
      await expect(
        service.create({
          jobId: "job-configured",
          firstName: "Linh",
          lastName: "Tran",
          candidateEmail: "linh@example.com",
          coverLetter: "Excited to join!",
          screeningAnswers: JSON.stringify([
            { questionId: "q-react", answer: "5 years" },
          ]),
        }),
      ).rejects.toBeInstanceOf(AppBadRequestException);

      // Missing required screening question -> rejected
      await expect(
        service.create({
          jobId: "job-configured",
          firstName: "Linh",
          lastName: "Tran",
          candidateEmail: "linh@example.com",
          candidatePhone: "0901234567",
          coverLetter: "Excited to join!",
        }),
      ).rejects.toBeInstanceOf(AppBadRequestException);

      // Valid submission without CV when resume is optional
      const created = await service.create({
        jobId: "job-configured",
        firstName: "Linh",
        lastName: "Tran",
        candidateEmail: "linh2@example.com",
        candidatePhone: "0901234567",
        coverLetter: "Excited to contribute!",
        screeningAnswers: JSON.stringify([
          { questionId: "q-react", answer: "5 years" },
          { questionId: "q-remote", answer: true },
        ]),
      });

      expect(created).toBeDefined();
      const storedApp = applicationTable.store.find(
        (a) => a.jobId === "job-configured",
      );
      expect(storedApp?.coverLetter).toBe("Excited to contribute!");
      expect(storedApp?.screeningAnswers).toEqual([
        {
          questionId: "q-react",
          questionText: "Years of React experience?",
          questionType: "short_text",
          answer: "5 years",
        },
        {
          questionId: "q-remote",
          questionText: "Open to remote?",
          questionType: "yes_no",
          answer: true,
        },
      ]);
    });

    it("validates number, date, url, and file_upload screening questions including PDF MinIO storage", async () => {
      await jobTable.create({
        id: "job-9types",
        title: "Fullstack Engineer",
        status: "PUBLISHED",
        organizationId: "org-1",
        applicationFormConfig: {
          phone: "optional",
          resume: "optional",
          coverLetter: "hidden",
          screeningQuestions: [
            { id: "q-num", text: "Years", type: "number", required: true },
            { id: "q-date", text: "Start date", type: "date", required: true },
            { id: "q-url", text: "Portfolio", type: "url", required: false },
            {
              id: "q-file",
              text: "Certificate PDF",
              type: "file_upload",
              required: true,
            },
          ],
        },
      });

      const validPdf = {
        originalname: "certificate.pdf",
        mimetype: "application/pdf",
        size: 512,
        buffer: Buffer.from("%PDF-1.4\n%test\n%%EOF\n"),
      } as Express.Multer.File;
      const screeningFiles = new Map([["q-file", validPdf]]);

      // Invalid URL rejected
      await expect(
        service.create(
          {
            jobId: "job-9types",
            firstName: "Minh",
            lastName: "Le",
            candidateEmail: "minh1@example.com",
            screeningAnswers: JSON.stringify([
              { questionId: "q-num", answer: 4 },
              { questionId: "q-date", answer: "2026-12-01" },
              { questionId: "q-url", answer: "not-a-url" },
            ]),
          },
          undefined,
          null,
          screeningFiles,
        ),
      ).rejects.toBeInstanceOf(AppBadRequestException);

      // Missing required file_upload rejected
      await expect(
        service.create({
          jobId: "job-9types",
          firstName: "Minh",
          lastName: "Le",
          candidateEmail: "minh2@example.com",
          screeningAnswers: JSON.stringify([
            { questionId: "q-num", answer: 4 },
            { questionId: "q-date", answer: "2026-12-01" },
          ]),
        }),
      ).rejects.toBeInstanceOf(AppBadRequestException);

      // Valid submission with PDF file
      await service.create(
        {
          jobId: "job-9types",
          firstName: "Minh",
          lastName: "Le",
          candidateEmail: "minh3@example.com",
          screeningAnswers: JSON.stringify([
            { questionId: "q-num", answer: "4" },
            { questionId: "q-date", answer: "2026-12-01" },
            { questionId: "q-url", answer: "https://minh.dev" },
          ]),
        },
        undefined,
        null,
        screeningFiles,
      );

      const stored = applicationTable.store.find(
        (a) => a.jobId === "job-9types",
      );
      expect(stored?.screeningAnswers).toEqual([
        {
          questionId: "q-num",
          questionText: "Years",
          questionType: "number",
          answer: 4,
        },
        {
          questionId: "q-date",
          questionText: "Start date",
          questionType: "date",
          answer: "2026-12-01",
        },
        {
          questionId: "q-url",
          questionText: "Portfolio",
          questionType: "url",
          answer: "https://minh.dev",
        },
        {
          questionId: "q-file",
          questionText: "Certificate PDF",
          questionType: "file_upload",
          answer: expect.objectContaining({
            fileName: "certificate.pdf",
            mimeType: "application/pdf",
          }),
        },
      ]);
    });
  });
});
