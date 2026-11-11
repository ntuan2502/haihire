import { describe, it, expect, vi, beforeEach } from "vitest";
import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";
import { RolesGuard } from "../auth/roles.guard";
import { Reflector } from "@nestjs/core";
import {
  AppForbiddenException,
  AppUnauthorizedException,
} from "../common/app-exception";
import { Role } from "@haihire/shared";
import type { ExecutionContext } from "@nestjs/common";
import type { Response } from "express";

describe("CandidatesController", () => {
  let controller: CandidatesController;
  let service: CandidatesService;
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
    findNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
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
    service = mockService as unknown as CandidatesService;
    controller = new CandidatesController(service);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  describe("GET /candidates (candidate:view permission)", () => {
    it("rejects Role.MEMBER with 403 AppForbiddenException", () => {
      const context = {
        getHandler: () => controller.findAll,
        getClass: () => CandidatesController,
        switchToHttp: () => ({ getRequest: () => memberReq }),
      } as unknown as ExecutionContext;
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    });

    it("allows Role.RECRUITER and delegates to service.findAll", async () => {
      const context = {
        getHandler: () => controller.findAll,
        getClass: () => CandidatesController,
        switchToHttp: () => ({ getRequest: () => recruiterReq }),
      } as unknown as ExecutionContext;
      expect(rolesGuard.canActivate(context)).toBe(true);

      const mockResult = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [
          {
            id: "candidate-1",
            name: "Alice",
            email: "alice@example.com",
            phone: "123",
            latestNote: {
              id: "note-1",
              content: "internal notes",
              authorName: "Recruiter",
              createdAt: new Date().toISOString(),
            },
            notesCount: 1,
            resumeUrl: "https://storage.haihire.local/resume.pdf",
            documents: [{ id: "doc-1" }],
            applications: [],
            applicationsCount: 0,
          },
        ],
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(recruiterReq);
      expect(result).toEqual(mockResult);
      expect(mockService.findAll).toHaveBeenCalledWith(
        undefined,
        {
          page: undefined,
          limit: undefined,
          search: undefined,
        },
        "org-1",
      );
    });
  });

  const createMockContext = (req: { user?: unknown }): ExecutionContext =>
    ({
      getHandler: () => controller.downloadDocument,
      getClass: () => CandidatesController,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => mockRes,
      }),
    }) as unknown as ExecutionContext;

  describe("GET /candidates/:id/documents/download (F-001 RBAC guard)", () => {
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
        asciiFallback: "candidate-cv.pdf",
        encodedFileName: "candidate-cv.pdf",
        mimeType: "application/pdf",
        stream: mockStream,
      });

      // Act
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);

      await controller.downloadDocument(
        "cand-1",
        "https://storage.haihire.local/candidate-cv.pdf",
        "candidate-cv.pdf",
        mockRes,
        recruiterReq,
      );

      // Assert
      expect(mockService.prepareDocumentDownload).toHaveBeenCalledWith(
        "cand-1",
        "https://storage.haihire.local/candidate-cv.pdf",
        "candidate-cv.pdf",
        "org-1",
        recruiterReq.user,
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        "attachment; filename=\"candidate-cv.pdf\"; filename*=UTF-8''candidate-cv.pdf",
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

  describe("GET /candidates/:id (candidate:view permission)", () => {
    const createFindOneContext = (req: { user?: unknown }): ExecutionContext =>
      ({
        getHandler: () => controller.findOne,
        getClass: () => CandidatesController,
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => mockRes,
        }),
      }) as unknown as ExecutionContext;

    it("Case 1: rejects Role.MEMBER with 403 AppForbiddenException", () => {
      // Arrange
      const context = createFindOneContext(memberReq);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    });

    it("Case 2: allows Role.RECRUITER and delegates to service.findOne", async () => {
      // Arrange
      const context = createFindOneContext(recruiterReq);
      mockService.findOne.mockResolvedValue({
        id: "cand-1",
        name: "Test Candidate",
      });

      // Act
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);

      const result = await controller.findOne("cand-1", recruiterReq);

      // Assert
      expect(mockService.findOne).toHaveBeenCalledWith(
        "cand-1",
        "org-1",
        recruiterReq.user,
      );
      expect(result).toEqual({ id: "cand-1", name: "Test Candidate" });
    });
  });

  describe("Candidate Notes Endpoints", () => {
    it("delegates findNotes to candidatesService.findNotes", async () => {
      mockService.findNotes.mockResolvedValue([{ id: "n-1", content: "test" }]);
      const res = await controller.findNotes("cand-1", recruiterReq);
      expect(mockService.findNotes).toHaveBeenCalledWith("cand-1", "org-1");
      expect(res).toEqual([{ id: "n-1", content: "test" }]);
    });

    it("delegates createNote to candidatesService.createNote", async () => {
      mockService.createNote.mockResolvedValue({
        id: "n-2",
        content: "new note",
      });
      const res = await controller.createNote(
        "cand-1",
        { content: "new note" },
        recruiterReq as never,
      );
      expect(mockService.createNote).toHaveBeenCalledWith(
        "cand-1",
        { content: "new note" },
        recruiterReq.user,
      );
      expect(res).toEqual({ id: "n-2", content: "new note" });
    });

    it("delegates updateNote to candidatesService.updateNote", async () => {
      mockService.updateNote.mockResolvedValue({
        id: "n-2",
        content: "updated",
      });
      const res = await controller.updateNote(
        "cand-1",
        "n-2",
        { content: "updated" },
        recruiterReq as never,
      );
      expect(mockService.updateNote).toHaveBeenCalledWith(
        "cand-1",
        "n-2",
        { content: "updated" },
        recruiterReq.user,
      );
      expect(res).toEqual({ id: "n-2", content: "updated" });
    });

    it("delegates deleteNote to candidatesService.deleteNote", async () => {
      mockService.deleteNote.mockResolvedValue({ success: true });
      const res = await controller.deleteNote(
        "cand-1",
        "n-2",
        recruiterReq as never,
      );
      expect(mockService.deleteNote).toHaveBeenCalledWith(
        "cand-1",
        "n-2",
        recruiterReq.user,
      );
      expect(res).toEqual({ success: true });
    });
  });
});
