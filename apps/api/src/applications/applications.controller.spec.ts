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
    findAll: vi.fn(),
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

    it("findAll: allows authenticated user with application:view and rejects unauthenticated/unauthorized", () => {
      const allowedContext = createMockContext(
        recruiterReq,
        controller.findAll,
      );
      expect(rolesGuard.canActivate(allowedContext)).toBe(true);

      const unauthContext = createMockContext(
        unauthenticatedReq,
        controller.findAll,
      );
      expect(() => rolesGuard.canActivate(unauthContext)).toThrow(
        AppUnauthorizedException,
      );

      const forbiddenContext = createMockContext(
        invalidRoleReq,
        controller.findAll,
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
});
