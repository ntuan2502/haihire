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

  const createMockContext = (req: { user?: unknown }): ExecutionContext =>
    ({
      getHandler: () => controller.downloadDocument,
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
  });
});
