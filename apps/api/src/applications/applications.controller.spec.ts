import { EventEmitter } from "node:events";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { RolesGuard } from "../auth/roles.guard";
import { Reflector } from "@nestjs/core";
import {
  AppForbiddenException,
  AppUnauthorizedException,
} from "../common/app-exception";
import { Role } from "@haihire/shared";
import type { ExecutionContext } from "@nestjs/common";
import type { Response } from "express";
import { DtoPipe } from "../common/dto-validation.pipe";
import { PublicApplyDto } from "./dto/public-apply.dto";
import type { PermissionResolverService } from "../auth/permission-resolver.service";

describe("ApplicationsController", () => {
  let controller: ApplicationsController;
  let service: ApplicationsService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockStream = {
    pipe: vi.fn(),
  };

  const mockRes = {
    setHeader: vi.fn(),
  } as unknown as Response;

  const mockService = {
    listPaginated: vi.fn(),
    getStats: vi.fn(),
    findByJob: vi.fn(),
    findOne: vi.fn(),
    uploadDocument: vi.fn(),
    prepareDocumentDownload: vi.fn(),
  };

  const recruiterReq = {
    user: {
      id: "recruiter-1",
      email: "recruiter@haihire.local",
      role: Role.RECRUITER,
      organizationId: "org-1",
    },
  };

  const memberReq = {
    user: {
      id: "member-1",
      email: "member@haihire.local",
      role: Role.MEMBER,
      organizationId: "org-1",
    },
  };

  const unauthenticatedReq = {
    user: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as ApplicationsService;
    controller = new ApplicationsController(service);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  type RouteHandler = (...args: never[]) => unknown;

  const createMockContext = (
    req: { user?: unknown },
    handler: RouteHandler = controller.downloadDocument as RouteHandler,
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => ApplicationsController,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => mockRes,
      }),
    }) as unknown as ExecutionContext;

  describe("GET /applications/:id/documents/download (F-001 RBAC guard)", () => {
    it("Case 1: rejects Role.MEMBER with 403 AppForbiddenException", () => {
      // Arrange
      const context = createMockContext(memberReq);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    });

    it("Case 2: allows Role.RECRUITER and streams the document successfully (200 OK)", async () => {
      // Arrange
      const context = createMockContext(recruiterReq);
      mockService.prepareDocumentDownload.mockResolvedValue({
        asciiFallback: "cv-candidate.pdf",
        encodedFileName: "cv-candidate.pdf",
        mimeType: "application/pdf",
        stream: mockStream,
      });

      // Act
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);

      await controller.downloadDocument(
        "app-1",
        "https://storage.haihire.local/cv.pdf",
        "cv-candidate.pdf",
        mockRes,
        recruiterReq,
      );

      // Assert
      expect(mockService.prepareDocumentDownload).toHaveBeenCalledWith(
        "app-1",
        "https://storage.haihire.local/cv.pdf",
        "cv-candidate.pdf",
        "org-1",
        recruiterReq.user,
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        "attachment; filename=\"cv-candidate.pdf\"; filename*=UTF-8''cv-candidate.pdf",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf",
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it("Case 3: rejects unauthenticated requests with 401 AppUnauthorizedException when no user in context", () => {
      // Arrange
      const context = createMockContext(unauthenticatedReq);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppUnauthorizedException,
      );
    });

    it("Case 4: allows dynamic organization owner (isOwner: true) to preview inline documents", async () => {
      const ownerReq = {
        user: {
          id: "owner-1",
          email: "owner@haihire.local",
          role: Role.MEMBER,
          isOwner: true,
          organizationId: "org-1",
        },
      };
      const context = createMockContext(ownerReq);
      mockService.prepareDocumentDownload.mockResolvedValue({
        asciiFallback: "owner-preview.pdf",
        encodedFileName: "owner-preview.pdf",
        mimeType: "application/pdf",
        stream: mockStream,
      });

      expect(rolesGuard.canActivate(context)).toBe(true);

      await controller.downloadDocument(
        "app-1",
        "/haihire-resumes/tenants/org-1/resumes/owner-preview.pdf",
        "owner-preview.pdf",
        mockRes,
        ownerReq,
        "inline",
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        "inline; filename=\"owner-preview.pdf\"; filename*=UTF-8''owner-preview.pdf",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf",
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });
  });

  describe("Application Read Endpoints RBAC Guards (F02)", () => {
    const invalidRoleReq = {
      user: {
        id: "guest-1",
        email: "guest@haihire.local",
        role: "INVALID_ROLE",
        organizationId: "org-1",
      },
    };

    it("listPaginated: allows authenticated user with application:view and rejects unauthenticated/unauthorized", () => {
      const allowedContext = createMockContext(
        recruiterReq,
        controller.listPaginated,
      );
      expect(rolesGuard.canActivate(allowedContext)).toBe(true);

      const unauthContext = createMockContext(
        unauthenticatedReq,
        controller.listPaginated,
      );
      expect(() => rolesGuard.canActivate(unauthContext)).toThrow(
        AppUnauthorizedException,
      );

      const forbiddenContext = createMockContext(
        invalidRoleReq,
        controller.listPaginated,
      );
      expect(() => rolesGuard.canActivate(forbiddenContext)).toThrow(
        AppForbiddenException,
      );
    });

    it("findByJob: allows authenticated user with application:view and rejects unauthenticated/unauthorized", () => {
      const allowedContext = createMockContext(
        recruiterReq,
        controller.findByJob,
      );
      expect(rolesGuard.canActivate(allowedContext)).toBe(true);

      const unauthContext = createMockContext(
        unauthenticatedReq,
        controller.findByJob,
      );
      expect(() => rolesGuard.canActivate(unauthContext)).toThrow(
        AppUnauthorizedException,
      );

      const forbiddenContext = createMockContext(
        invalidRoleReq,
        controller.findByJob,
      );
      expect(() => rolesGuard.canActivate(forbiddenContext)).toThrow(
        AppForbiddenException,
      );
    });

    it("findOne: allows authenticated user with application:view and rejects unauthenticated/unauthorized", () => {
      const allowedContext = createMockContext(
        recruiterReq,
        controller.findOne,
      );
      expect(rolesGuard.canActivate(allowedContext)).toBe(true);

      const unauthContext = createMockContext(
        unauthenticatedReq,
        controller.findOne,
      );
      expect(() => rolesGuard.canActivate(unauthContext)).toThrow(
        AppUnauthorizedException,
      );

      const forbiddenContext = createMockContext(
        invalidRoleReq,
        controller.findOne,
      );
      expect(() => rolesGuard.canActivate(forbiddenContext)).toThrow(
        AppForbiddenException,
      );
    });

    it("getStats: delegates tenant stats lookup and requires application:view permission", async () => {
      const allowedContext = createMockContext(
        recruiterReq,
        controller.getStats,
      );
      expect(rolesGuard.canActivate(allowedContext)).toBe(true);

      const unauthContext = createMockContext(
        unauthenticatedReq,
        controller.getStats,
      );
      expect(() => rolesGuard.canActivate(unauthContext)).toThrow(
        AppUnauthorizedException,
      );

      mockService.getStats.mockResolvedValueOnce({
        totalApplications: 150,
        byStage: {
          APPLIED: 50,
          SCREENING: 40,
          INTERVIEW: 30,
          OFFER: 20,
          HIRED: 5,
          REJECTED: 5,
        },
        byJob: {},
      });

      const stats = await controller.getStats(recruiterReq as never, "org-1");
      expect(mockService.getStats).toHaveBeenCalledWith("org-1", "org-1");
      expect(stats.totalApplications).toBe(150);
    });
  });

  describe("Application Read Endpoints Candidate PII Masking (candidate:view)", () => {
    it("passes fullCandidateAccess = false for Role.MEMBER and true for Role.RECRUITER on listPaginated, findByJob, and findOne", async () => {
      mockService.listPaginated.mockResolvedValue({ data: [], total: 0 });
      mockService.findByJob.mockResolvedValue([]);
      mockService.findOne.mockResolvedValue({ id: "app-1" });

      await controller.listPaginated(memberReq as never, {
        organizationId: "org-1",
        page: 1,
        limit: 20,
      });
      expect(mockService.listPaginated).toHaveBeenCalledWith(
        "org-1",
        {
          page: 1,
          limit: 20,
          search: undefined,
          jobId: undefined,
          stage: undefined,
          score: undefined,
          sortBy: undefined,
          sortOrder: undefined,
        },
        "org-1",
        false,
      );

      await controller.findByJob("job-1", "50", "0", memberReq as never);
      expect(mockService.findByJob).toHaveBeenCalledWith(
        "job-1",
        "org-1",
        { limit: 50, offset: 0 },
        false,
      );

      await controller.findOne("app-1", memberReq as never);
      expect(mockService.findOne).toHaveBeenCalledWith("app-1", "org-1", false);

      await controller.listPaginated(recruiterReq as never, {
        organizationId: "org-1",
        score: "80",
        sortBy: "score",
        sortOrder: "desc",
      });
      expect(mockService.listPaginated).toHaveBeenLastCalledWith(
        "org-1",
        expect.objectContaining({
          score: "80",
          sortBy: "score",
          sortOrder: "desc",
        }),
        "org-1",
        true,
      );

      await controller.findByJob(
        "job-1",
        undefined,
        undefined,
        recruiterReq as never,
      );
      expect(mockService.findByJob).toHaveBeenLastCalledWith(
        "job-1",
        "org-1",
        { limit: undefined, offset: undefined },
        true,
      );

      await controller.findOne("app-1", recruiterReq as never);
      expect(mockService.findOne).toHaveBeenLastCalledWith(
        "app-1",
        "org-1",
        true,
      );
    });

    it("passes fullCandidateAccess = true when PermissionResolverService grants candidate:view override for MEMBER or user isOwner", async () => {
      const resolvePermission = vi.fn().mockResolvedValue(true);
      const customController = new ApplicationsController(service, {
        resolvePermission,
      } as unknown as PermissionResolverService);

      mockService.findByJob.mockResolvedValue([]);
      await customController.findByJob(
        "job-1",
        undefined,
        undefined,
        memberReq as never,
      );

      expect(resolvePermission).toHaveBeenCalledWith(
        "org-1",
        Role.MEMBER,
        "candidate:view",
      );
      expect(mockService.findByJob).toHaveBeenCalledWith(
        "job-1",
        "org-1",
        { limit: undefined, offset: undefined },
        true,
      );

      const ownerReq = {
        user: {
          id: "owner-1",
          role: Role.MEMBER,
          isOwner: true,
          organizationId: "org-1",
        },
      };
      await customController.findOne("app-1", ownerReq as never);
      expect(mockService.findOne).toHaveBeenLastCalledWith(
        "app-1",
        "org-1",
        true,
      );
    });
  });

  describe("POST /applications/apply DtoPipe(PublicApplyDto)", () => {
    it("accepts public apply payloads containing document.referrer and authenticated apply-to-job payloads using candidateId", async () => {
      const pipe = DtoPipe(PublicApplyDto);
      const argMeta = { type: "body" as const, metatype: PublicApplyDto };

      const publicResult = await pipe.transform(
        {
          jobId: "00000000-0000-4000-8000-000000000001",
          firstName: "Public",
          lastName: "Applicant",
          candidateEmail: "public@example.com",
          referrer: "https://www.linkedin.com/jobs/view/123",
        },
        argMeta,
      );
      expect(publicResult).toBeInstanceOf(PublicApplyDto);
      expect(publicResult.referrer).toBe(
        "https://www.linkedin.com/jobs/view/123",
      );

      const internalResult = await pipe.transform(
        {
          jobId: "00000000-0000-4000-8000-000000000001",
          candidateId: "00000000-0000-4000-8000-000000000002",
          candidateEmail: "cand@example.com",
          resumeUrl: "/haihire-resumes/tenants/org-1/resumes/cv.pdf",
          resumeFileName: "cv.pdf",
        },
        argMeta,
      );
      expect(internalResult).toBeInstanceOf(PublicApplyDto);
      expect(internalResult.candidateId).toBe(
        "00000000-0000-4000-8000-000000000002",
      );
    });
  });

  describe("GET /applications/:id/documents/download stream safety & Content-Disposition sanitization", () => {
    it("handles stream errors safely without crashing the process and strips quotes/semicolons from filename", async () => {
      const realStream = new EventEmitter() as EventEmitter & {
        pipe: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
      };
      realStream.pipe = vi.fn();
      realStream.destroy = vi.fn();

      const resEmitter = new EventEmitter() as EventEmitter & {
        setHeader: ReturnType<typeof vi.fn>;
        status: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
        headersSent: boolean;
        writableEnded: boolean;
      };
      resEmitter.setHeader = vi.fn();
      resEmitter.end = vi.fn();
      resEmitter.status = vi.fn().mockReturnValue(resEmitter);
      resEmitter.destroy = vi.fn();
      resEmitter.headersSent = false;
      resEmitter.writableEnded = false;

      mockService.prepareDocumentDownload.mockResolvedValue({
        asciiFallback: 'evil"; filename="hack.exe',
        encodedFileName: "evil.pdf",
        mimeType: "application/pdf",
        stream: realStream,
      });

      await controller.downloadDocument(
        "app-1",
        "tenants/org-1/cv.pdf",
        'evil"; filename="hack.exe',
        resEmitter as unknown as Response,
        recruiterReq,
      );

      expect(resEmitter.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.not.stringContaining('filename="hack.exe'),
      );
      expect(() =>
        realStream.emit("error", new Error("MinIO reset")),
      ).not.toThrow();
      expect(resEmitter.status).toHaveBeenCalledWith(502);
    });
  });
});
