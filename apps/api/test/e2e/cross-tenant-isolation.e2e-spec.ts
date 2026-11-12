import { createTestApplicationsService } from "../../src/test/helpers/service-factories";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockPrismaService } from "../../src/test/helpers/prisma-composer-mock";
import { CandidatesController } from "../../src/candidates/candidates.controller";
import { CandidatesService } from "../../src/candidates/candidates.service";
import { ApplicationsController } from "../../src/applications/applications.controller";
import { ApplicationsService } from "../../src/applications/applications.service";
import { TenantGuard } from "../../src/common/guards/tenant.guard";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../src/common/app-exception";
import type { ExecutionContext, Response } from "@nestjs/common";
import { Readable } from "node:stream";

interface MockDb {
  organizations: Array<{ id: string; name: string }>;
  orgMembers: Array<{
    id: string;
    userId: string;
    organizationId: string;
    role: string;
  }>;
  jobs: Array<{
    id: string;
    organizationId: string;
    title: string;
    status: string;
  }>;
  candidates: Array<{
    id: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    resumeUrl: string;
    resumeFileName: string;
    resumeMimeType: string;
    resumeFileSize: number;
    deletedAt?: Date | null;
  }>;
  applications: Array<{
    id: string;
    jobId: string;
    candidateId: string;
    stage: string;
    notes?: string;
    resumeUrl: string;
    resumeFileName: string;
    resumeMimeType: string;
    resumeFileSize: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  candidateDocuments: Array<{
    id: string;
    candidateId: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    documentType: string;
  }>;
  applicationDocuments: Array<{
    id: string;
    applicationId: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>;
  activities: Array<Record<string, unknown>>;
}

describe("Cross-Tenant Isolation E2E Security Test Suite (P0)", () => {
  let db: MockDb;
  let candidatesController: CandidatesController;
  let applicationsController: ApplicationsController;
  let candidatesService: CandidatesService;
  let applicationsService: ApplicationsService;
  let tenantGuard: TenantGuard;

  // Mock Request User Identities
  const userA = {
    id: "usr-alpha-1",
    name: "Alice Recruiter (Org A)",
    email: "alice@alpha.corp",
    organizationId: "org-alpha-1",
  };

  const userB = {
    id: "usr-beta-2",
    name: "Bob Intruder (Org B)",
    email: "bob@beta.corp",
    organizationId: "org-beta-2",
  };

  beforeEach(() => {
    db = {
      organizations: [
        { id: "org-alpha-1", name: "Alpha Technology Corp" },
        { id: "org-beta-2", name: "Beta Financial Partners" },
      ],
      orgMembers: [
        {
          id: "mem-a",
          userId: "usr-alpha-1",
          organizationId: "org-alpha-1",
          role: "ADMIN",
        },
        {
          id: "mem-b",
          userId: "usr-beta-2",
          organizationId: "org-beta-2",
          role: "ADMIN",
        },
      ],
      jobs: [
        {
          id: "job-alpha-1",
          organizationId: "org-alpha-1",
          title: "Principal Staff Engineer (Confidential)",
          status: "PUBLISHED",
        },
      ],
      candidates: [
        {
          id: "cand-alpha-1",
          organizationId: "org-alpha-1",
          firstName: "Charlie",
          lastName: "Alpha",
          email: "charlie@alpha-candidate.com",
          phone: "+84901234567",
          resumeUrl:
            "http://minio:9000/haihire-resumes/org-alpha-1/cand-alpha-1/cv.pdf",
          resumeFileName: "cv.pdf",
          resumeMimeType: "application/pdf",
          resumeFileSize: 1048576,
          deletedAt: null,
        },
      ],
      applications: [
        {
          id: "app-alpha-1",
          jobId: "job-alpha-1",
          candidateId: "cand-alpha-1",
          stage: "NEW",
          notes: "Confidential salary expectation: $150k",
          resumeUrl:
            "http://minio:9000/haihire-resumes/org-alpha-1/cand-alpha-1/cv.pdf",
          resumeFileName: "cv.pdf",
          resumeMimeType: "application/pdf",
          resumeFileSize: 1048576,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      candidateDocuments: [
        {
          id: "cdoc-alpha-1",
          candidateId: "cand-alpha-1",
          fileUrl:
            "http://minio:9000/haihire-resumes/org-alpha-1/cand-alpha-1/portfolio.pdf",
          fileName: "portfolio.pdf",
          mimeType: "application/pdf",
          fileSize: 204800,
          documentType: "PORTFOLIO",
        },
      ],
      applicationDocuments: [
        {
          id: "adoc-alpha-1",
          applicationId: "app-alpha-1",
          fileUrl:
            "http://minio:9000/haihire-resumes/org-alpha-1/cand-alpha-1/cv.pdf",
          fileName: "cv.pdf",
          mimeType: "application/pdf",
          fileSize: 1048576,
        },
      ],
      activities: [],
    };

    const mockPrisma = createMockPrismaService({
      organization: db.organizations,
      organizationMember: db.orgMembers,
      job: db.jobs,
      candidate: db.candidates,
      application: db.applications,
      candidateDocument: db.candidateDocuments.map((d) => ({
        ...d,
        url: d.fileUrl,
      })),
      applicationDocument: db.applicationDocuments.map((d) => ({
        ...d,
        url: d.fileUrl,
      })),
      activityLog: db.activities,
      interview: [],
    });

    const mockMinioService = {
      getFileStream: vi.fn().mockImplementation(async () => {
        return Readable.from([Buffer.from("PDF Mock Content")]);
      }),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    const mockActivitiesService = {
      createActivity: vi.fn().mockImplementation(async (data) => {
        db.activities.push(data);
        return data;
      }),
    };

    const mockEmailService = {
      queueEmail: vi.fn().mockResolvedValue(true),
    };

    candidatesService = new CandidatesService(
      mockPrisma as never,
      mockMinioService as never,
    );
    applicationsService = createTestApplicationsService(
      mockPrisma as never,
      mockMinioService as never,
      mockActivitiesService as never,
      mockEmailService as never,
    );

    candidatesController = new CandidatesController(candidatesService);
    applicationsController = new ApplicationsController(applicationsService);
    tenantGuard = new TenantGuard(mockPrisma as never);
  });

  const createMockResponse = (): Response => {
    const headers: Record<string, string> = {};
    return {
      setHeader: vi.fn((key: string, val: string) => {
        headers[key.toLowerCase()] = val;
      }),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;
  };

  describe("Mandatory P0 Cross-Tenant Isolation Assertions", () => {
    it("Case 1: User B calling GET /candidates/:id (Candidate A) throws 403/404 with ZERO data leak", async () => {
      // User B attempts to access Candidate A belonging to Org A
      await expect(
        candidatesController.findOne("cand-alpha-1", { user: userB }),
      ).rejects.toSatisfy((err: unknown) => {
        const isForbiddenOrNotFound =
          err instanceof AppForbiddenException ||
          err instanceof AppNotFoundException;
        const status = (err as { getStatus?: () => number })?.getStatus?.();
        return isForbiddenOrNotFound && (status === 403 || status === 404);
      });
    });

    it("Case 2: User B calling GET /applications/:id (Application A) throws 403/404 with ZERO data leak", async () => {
      // User B attempts to access Application A belonging to Org A
      await expect(
        applicationsController.findOne("app-alpha-1", { user: userB }),
      ).rejects.toSatisfy((err: unknown) => {
        const isForbiddenOrNotFound =
          err instanceof AppForbiddenException ||
          err instanceof AppNotFoundException;
        const status = (err as { getStatus?: () => number })?.getStatus?.();
        return isForbiddenOrNotFound && (status === 403 || status === 404);
      });
    });

    it("Case 3: User B calling GET /candidates/:id/documents/download (Document of Candidate A) throws 403/404", async () => {
      const mockRes = createMockResponse();

      await expect(
        candidatesController.downloadDocument(
          "cand-alpha-1",
          "http://minio:9000/haihire-resumes/org-alpha-1/cand-alpha-1/portfolio.pdf",
          "portfolio.pdf",
          mockRes,
          { user: userB },
        ),
      ).rejects.toSatisfy((err: unknown) => {
        const isForbiddenOrNotFound =
          err instanceof AppForbiddenException ||
          err instanceof AppNotFoundException;
        const status = (err as { getStatus?: () => number })?.getStatus?.();
        return isForbiddenOrNotFound && (status === 403 || status === 404);
      });
    });

    it("Case 4: User B calling GET /applications/:id/documents/download (Document of Application A) throws 403/404", async () => {
      const mockRes = createMockResponse();

      await expect(
        applicationsController.downloadDocument(
          "app-alpha-1",
          "http://minio:9000/haihire-resumes/org-alpha-1/cand-alpha-1/cv.pdf",
          "cv.pdf",
          mockRes,
          { user: userB },
        ),
      ).rejects.toSatisfy((err: unknown) => {
        const isForbiddenOrNotFound =
          err instanceof AppForbiddenException ||
          err instanceof AppNotFoundException;
        const status = (err as { getStatus?: () => number })?.getStatus?.();
        return isForbiddenOrNotFound && (status === 403 || status === 404);
      });
    });

    it("Case 5: User B calling PATCH /candidates/:id (Candidate A) throws 403/404 and does NOT mutate data", async () => {
      await expect(
        candidatesController.update(
          "cand-alpha-1",
          { firstName: "MALICIOUS" },
          { user: userB },
        ),
      ).rejects.toSatisfy((err: unknown) => {
        const isForbiddenOrNotFound =
          err instanceof AppForbiddenException ||
          err instanceof AppNotFoundException;
        const status = (err as { getStatus?: () => number })?.getStatus?.();
        return isForbiddenOrNotFound && (status === 403 || status === 404);
      });

      // Verify DB integrity - Candidate A is completely untouched
      const candidateA = db.candidates.find((c) => c.id === "cand-alpha-1");
      expect(candidateA?.firstName).toBe("Charlie");
      expect(candidateA?.lastName).toBe("Alpha");
    });

    it("Case 6: User B calling PATCH /applications/:id/stage (Application A) throws 403/404 and does NOT mutate stage", async () => {
      await expect(
        applicationsController.updateStage(
          "app-alpha-1",
          {
            stage:
              "OFFER" as unknown as import("@haihire/shared").RecruitmentStage,
          },
          { user: userB },
        ),
      ).rejects.toSatisfy((err: unknown) => {
        const isForbiddenOrNotFound =
          err instanceof AppForbiddenException ||
          err instanceof AppNotFoundException;
        const status = (err as { getStatus?: () => number })?.getStatus?.();
        return isForbiddenOrNotFound && (status === 403 || status === 404);
      });

      // Verify DB integrity - Application A stage is completely untouched
      const applicationA = db.applications.find((a) => a.id === "app-alpha-1");
      expect(applicationA?.stage).toBe("NEW");
    });

    it("Case 7: Sanity check - Legitimate User A accessing their own Candidate A and Application A succeeds", async () => {
      const candidate = await candidatesController.findOne("cand-alpha-1", {
        user: userA,
      });
      expect(candidate).toBeDefined();
      expect(candidate.name).toBe("Charlie Alpha");

      const application = await applicationsController.findOne("app-alpha-1", {
        user: userA,
      });
      expect(application).toBeDefined();
      expect(application.id).toBe("app-alpha-1");
    });

    it("Case 8: TenantGuard rejects cross-tenant organizationId spoofing in request query/params with 403", async () => {
      const spoofingContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: userB.id, organizationId: userB.organizationId },
            query: { organizationId: userA.organizationId }, // User B tries to query Org A's scope
            params: {},
            body: {},
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(tenantGuard.canActivate(spoofingContext)).rejects.toThrow(
        AppForbiddenException,
      );
    });
  });
});
