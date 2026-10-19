import { describe, expect, it, beforeEach, vi } from "vitest";
import { Readable } from "node:stream";
import { CandidatesService } from "./candidates.service";
import {
  createMockTable,
  type MockTable,
} from "../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../prisma/prisma.service";
import type { MinioService } from "../minio/minio.service";
import type { ActivitiesService } from "../activities/activities.service";
import {
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../common/app-exception";
import { toInstant } from "../common/date.util";

describe("CandidatesService (Characterization Tests)", () => {
  let service: CandidatesService;

  let candidateTable: MockTable<Record<string, unknown>>;
  let applicationTable: MockTable<Record<string, unknown>>;
  let jobTable: MockTable<Record<string, unknown>>;
  let interviewTable: MockTable<Record<string, unknown>>;
  let candidateDocTable: MockTable<Record<string, unknown>>;

  let mockPrisma: PrismaService;
  let mockMinio: MinioService;
  let mockActivities: ActivitiesService;

  beforeEach(() => {
    candidateTable = createMockTable([
      {
        id: "cand-1",
        organizationId: "org-1",
        name: "Nguyen Van A",
        firstName: "A",
        lastName: "Nguyen Van",
        email: "nguyenvana@example.com",
        phone: "0901234567",
        notes: "Experienced TypeScript developer",
        resumeUrl: "https://minio.local/resumes/org-1/resume-1.pdf",
        resumeFileName: "resume-1.pdf",
        resumeFileSize: 1024,
        resumeMimeType: "application/pdf",
        gender: "MALE",
        dateOfBirth: toInstant(),
        createdAt: toInstant(),
        updatedAt: toInstant(),
        deletedAt: null,
      },
      {
        id: "cand-2",
        organizationId: "org-1",
        name: "Tran Thi B",
        firstName: "B",
        lastName: "Tran Thi",
        email: "tranthib@example.com",
        phone: "0912345678",
        notes: "Junior React developer",
        resumeUrl: null,
        resumeFileName: null,
        resumeFileSize: null,
        resumeMimeType: null,
        gender: "FEMALE",
        dateOfBirth: null,
        createdAt: toInstant(),
        updatedAt: toInstant(),
        deletedAt: null,
      },
      {
        id: "cand-deleted",
        organizationId: "org-1",
        name: "Le Van C",
        firstName: "C",
        lastName: "Le Van",
        email: "levanc@example.com",
        phone: null,
        notes: "Soft deleted candidate",
        resumeUrl: null,
        createdAt: toInstant(),
        updatedAt: toInstant(),
        deletedAt: toInstant(),
      },
      {
        id: "cand-other-org",
        organizationId: "org-2",
        name: "Pham Van D",
        firstName: "D",
        lastName: "Pham Van",
        email: "phamvand@example.com",
        phone: null,
        notes: "Belongs to Org 2",
        resumeUrl: null,
        createdAt: toInstant(),
        updatedAt: toInstant(),
        deletedAt: null,
      },
    ]);

    applicationTable = createMockTable([
      {
        id: "app-1",
        candidateId: "cand-1",
        jobId: "job-1",
        stage: "INTERVIEW",
        resumeUrl: "https://minio.local/resumes/org-1/app-resume-1.pdf",
        resumeFileName: "app-resume-1.pdf",
        resumeFileSize: 2048,
        resumeMimeType: "application/pdf",
        notes: "Solid technical background",
        orderIndex: 0,
        createdAt: toInstant(),
        updatedAt: toInstant(),
      },
    ]);

    jobTable = createMockTable([
      {
        id: "job-1",
        title: "Senior Full-Stack Engineer",
        department: "Engineering",
        location: "Ho Chi Minh City",
      },
    ]);

    interviewTable = createMockTable([
      {
        id: "intv-1",
        applicationId: "app-1",
        title: "Technical Round 1",
        scheduledAt: toInstant(),
        status: "COMPLETED",
      },
    ]);

    candidateDocTable = createMockTable([
      {
        id: "doc-1",
        candidateId: "cand-1",
        organizationId: "org-1",
        name: "Certificate.pdf",
        url: "https://minio.local/resumes/org-1/cert.pdf",
        size: 512,
        mimeType: "application/pdf",
        type: "Certificate",
        createdAt: toInstant(),
        updatedAt: toInstant(),
      },
    ]);

    const mockOrm = {
      public: {
        Candidate: candidateTable,
        Application: applicationTable,
        Job: jobTable,
        Interview: interviewTable,
        CandidateDocument: candidateDocTable,
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
        url: "https://minio.local/resumes/org-1/uploaded-file.pdf",
        originalName: "uploaded-file.pdf",
        size: 4096,
        mimeType: "application/pdf",
      }),
      extractObjectName: vi.fn().mockImplementation((url: string) => {
        const parts = url.split("/");
        return parts[parts.length - 1];
      }),
      getObjectStream: vi
        .fn()
        .mockResolvedValue(Readable.from(["mock stream content"])),
    } as unknown as MinioService;

    mockActivities = {
      createActivity: vi.fn().mockResolvedValue({ id: "act-1" }),
    } as unknown as ActivitiesService;

    service = new CandidatesService(mockPrisma, mockMinio, mockActivities);
  });

  describe("A.1.1: findAll", () => {
    it("enforces tenant isolation and throws AppForbiddenException on org mismatch", async () => {
      await expect(
        service.findAll("org-1", undefined, "org-2"),
      ).rejects.toThrow(AppForbiddenException);

      const result = await service.findAll("org-1", undefined, "org-1");
      expect(result.data).toHaveLength(2);
      expect(result.data.every((c) => c.organizationId === "org-1")).toBe(true);
    });

    it("filters out soft-deleted candidates", async () => {
      const result = await service.findAll("org-1");
      const ids = result.data.map((c) => c.id);
      expect(ids).toContain("cand-1");
      expect(ids).toContain("cand-2");
      expect(ids).not.toContain("cand-deleted");
    });

    it("applies search filtering across fields and slices paginated results", async () => {
      const searchByName = await service.findAll("org-1", { search: "Nguyen" });
      expect(searchByName.data).toHaveLength(1);
      expect(searchByName.data[0].id).toBe("cand-1");
      expect(searchByName.data[0].applicationsCount).toBe(1);

      const paged = await service.findAll("org-1", { page: 2, limit: 1 });
      expect(paged.page).toBe(2);
      expect(paged.limit).toBe(1);
      expect(paged.total).toBe(2);
      expect(paged.totalPages).toBe(2);
      expect(paged.data).toHaveLength(1);
    });
  });

  describe("A.1.2: findOne", () => {
    it("throws AppNotFoundException on non-existent or soft-deleted candidate", async () => {
      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        AppNotFoundException,
      );
      await expect(service.findOne("cand-deleted")).rejects.toThrow(
        AppNotFoundException,
      );
    });

    it("throws AppForbiddenException on cross-tenant candidate lookup", async () => {
      await expect(service.findOne("cand-other-org", "org-1")).rejects.toThrow(
        AppForbiddenException,
      );
    });

    it("aggregates applications, jobs, interviews, documents, and logs PII access", async () => {
      const candidate = await service.findOne("cand-1", "org-1", {
        id: "user-recruiter-1",
        name: "Recruiter Alice",
      });

      expect(candidate).toBeDefined();
      expect(candidate.id).toBe("cand-1");
      expect(candidate.applications).toHaveLength(1);
      expect(candidate.applications[0].job).toBeDefined();
      expect(candidate.applications[0].job?.title).toBe(
        "Senior Full-Stack Engineer",
      );
      expect(candidate.applications[0].interviews).toHaveLength(1);

      // Verify documents aggregation includes direct documents and application resume
      expect(candidate.allDocuments.length).toBeGreaterThanOrEqual(2);
      const docUrls = candidate.allDocuments.map((d: { url: string }) => d.url);
      expect(docUrls).toContain("https://minio.local/resumes/org-1/cert.pdf");
      expect(docUrls).toContain(
        "https://minio.local/resumes/org-1/app-resume-1.pdf",
      );

      // Verify PII access logging
      expect(mockActivities.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          candidateId: "cand-1",
          actorId: "user-recruiter-1",
          metadata: expect.objectContaining({
            action: "VIEW_PROFILE",
            accessType: "PII_READ",
          }),
        }),
      );
    });
  });

  describe("A.1.3: create", () => {
    it("rejects duplicate email within the same organization with AppConflictException (409)", async () => {
      await expect(
        service.create(
          {
            name: "Duplicate Email Candidate",
            email: "nguyenvana@example.com",
            organizationId: "org-1",
          },
          undefined,
          "org-1",
        ),
      ).rejects.toThrow(AppConflictException);
    });

    it("parses full name into first/last and parses dateOfBirth into Temporal.Instant", async () => {
      const created = await service.create(
        {
          name: "Tran Van Minh",
          email: "tranvanminh@example.com",
          dateOfBirth: "1995-05-20",
          phone: "0988776655",
          notes: "Initial screening notes",
        },
        undefined,
        "org-1",
      );

      expect(created).toBeDefined();
      expect(created.name).toBe("Tran Van Minh");
      expect(created.firstName).toBe("Minh");
      expect(created.lastName).toBe("Tran Van");
      expect(created.email).toBe("tranvanminh@example.com");
      expect(created.dateOfBirth).toBeDefined();
    });
  });

  describe("A.1.4: prepareDocumentDownload", () => {
    it("enforces SSRF protection by rejecting unassociated document URLs and provides RFC 5987 headers", async () => {
      // SSRF attack attempt with arbitrary or cross-tenant URL
      await expect(
        service.prepareDocumentDownload(
          "cand-1",
          "https://minio.local/resumes/other-tenant/private-cv.pdf",
          "private-cv.pdf",
          "org-1",
        ),
      ).rejects.toThrow(AppForbiddenException);

      // Legitimate download of candidate's own document
      const result = await service.prepareDocumentDownload(
        "cand-1",
        "https://minio.local/resumes/org-1/resume-1.pdf",
        "Hồ sơ ứng viên.pdf",
        "org-1",
        { id: "user-1", name: "Recruiter Bob" },
      );

      expect(result).toBeDefined();
      expect(result.cleanFileName).toBe("Hồ sơ ứng viên.pdf");
      expect(result.asciiFallback).toBeDefined();
      expect(result.encodedFileName).toBe(
        encodeURIComponent("Hồ sơ ứng viên.pdf"),
      );
      expect(result.stream).toBeDefined();
      expect(mockMinio.getObjectStream).toHaveBeenCalledWith(
        "https://minio.local/resumes/org-1/resume-1.pdf",
      );

      // Verify download audit logging
      expect(mockActivities.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          candidateId: "cand-1",
          metadata: expect.objectContaining({
            action: "DOWNLOAD_DOCUMENT",
            subType: "DOCUMENT_DOWNLOADED",
          }),
        }),
      );
    });
  });

  describe("A.1.5: remove", () => {
    it("performs soft-delete setting deletedAt within database transaction", async () => {
      const result = await service.remove("cand-1", "org-1");
      expect(result.success).toBe(true);
      expect(mockPrisma.transaction).toHaveBeenCalled();

      // Ensure candidate now has deletedAt set in the table
      const inDb = candidateTable.store.find((c) => c.id === "cand-1");
      expect(inDb?.deletedAt).toBeDefined();
      expect(inDb?.deletedAt).not.toBeNull();
    });
  });
});
