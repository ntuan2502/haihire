import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ApplicationsNotesService,
  type AuthenticatedUser,
} from "./applications-notes.service";
import {
  createMockTable,
  createMockPrismaService,
  type MockTable,
} from "../../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../../prisma/prisma.service";
import type { ActivitiesService } from "../../activities/activities.service";
import {
  AppNotFoundException,
  AppForbiddenException,
} from "../../common/app-exception";

describe("ApplicationsNotesService", () => {
  let service: ApplicationsNotesService;
  let applicationTable: MockTable<Record<string, unknown>>;
  let applicationNoteTable: MockTable<Record<string, unknown>>;
  let mockPrisma: PrismaService;
  let mockActivities: Partial<ActivitiesService>;

  const mockUser: AuthenticatedUser = {
    id: "user-1",
    sub: "user-1",
    email: "recruiter@example.com",
    name: "Jane Recruiter",
    role: "RECRUITER",
    organizationId: "org-1",
  };

  const mockAdminUser: AuthenticatedUser = {
    id: "admin-1",
    sub: "admin-1",
    email: "admin@example.com",
    name: "Alex Admin",
    role: "ADMIN",
    organizationId: "org-1",
  };

  const otherUser: AuthenticatedUser = {
    id: "user-2",
    sub: "user-2",
    email: "other@example.com",
    name: "Other User",
    role: "INTERVIEWER",
    organizationId: "org-1",
  };

  beforeEach(() => {
    applicationTable = createMockTable([
      {
        id: "app-1",
        organizationId: "org-1",
        candidateId: "cand-1",
        jobId: "job-1",
        notes: "Legacy Note 1 | Legacy Note 2",
      },
      {
        id: "app-2",
        organizationId: "org-2",
        candidateId: "cand-2",
        jobId: "job-2",
        notes: null,
      },
    ]);

    applicationNoteTable = createMockTable([
      {
        id: "note-1",
        organizationId: "org-1",
        applicationId: "app-1",
        authorId: "user-1",
        authorName: "Jane Recruiter",
        authorRole: "RECRUITER",
        content: "First Trello note",
        isEdited: false,
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        updatedAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);

    mockPrisma = createMockPrismaService({
      application: applicationTable,
      applicationNote: applicationNoteTable,
    });

    mockActivities = {
      createActivity: vi.fn().mockResolvedValue({ id: "act-1" }),
    };

    service = new ApplicationsNotesService(
      mockPrisma,
      mockActivities as ActivitiesService,
    );
  });

  describe("findNotes", () => {
    it("returns existing notes for an application scoped to tenant organization", async () => {
      const notes = await service.findNotes("app-1", mockUser);
      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe("First Trello note");
      expect(notes[0].authorName).toBe("Jane Recruiter");
    });

    it("throws AppForbiddenException when application belongs to another organization", async () => {
      await expect(service.findNotes("app-2", mockUser)).rejects.toThrow(
        AppForbiddenException,
      );
    });

    it("automatically migrates legacy delimited notes if no applicationNote exists", async () => {
      // Clear notes table for app-1
      applicationNoteTable.findMany = vi.fn().mockResolvedValueOnce([]);

      const notes = await service.findNotes("app-1", mockUser);
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.content)).toEqual(
        expect.arrayContaining(["Legacy Note 1", "Legacy Note 2"]),
      );
    });
  });

  describe("createNote", () => {
    it("creates a new note, logs activity, and updates application notes string", async () => {
      const created = await service.createNote(
        "app-1",
        { content: "Candidate demonstrated strong architecture skills" },
        mockUser,
      );

      expect(created.content).toBe(
        "Candidate demonstrated strong architecture skills",
      );
      expect(created.authorId).toBe("user-1");
      expect(created.authorName).toBe("Jane Recruiter");
      expect(created.authorRole).toBe("RECRUITER");

      expect(mockActivities.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          type: "NOTE_ADDED",
          applicationId: "app-1",
        }),
      );
    });

    it("throws AppNotFoundException when application not found", async () => {
      await expect(
        service.createNote("non-existent", { content: "Test" }, mockUser),
      ).rejects.toThrow(AppNotFoundException);
    });
  });

  describe("updateNote", () => {
    it("allows the original author to update note content and sets isEdited to true", async () => {
      const updated = await service.updateNote(
        "app-1",
        "note-1",
        { content: "Updated note content" },
        mockUser,
      );

      expect(updated.content).toBe("Updated note content");
      expect(updated.isEdited).toBe(true);
    });

    it("allows ADMIN to update any note", async () => {
      const updated = await service.updateNote(
        "app-1",
        "note-1",
        { content: "Admin updated content" },
        mockAdminUser,
      );

      expect(updated.content).toBe("Admin updated content");
      expect(updated.isEdited).toBe(true);
    });

    it("throws AppForbiddenException when a non-author non-admin tries to update note", async () => {
      await expect(
        service.updateNote(
          "app-1",
          "note-1",
          { content: "Malicious update" },
          otherUser,
        ),
      ).rejects.toThrow(AppForbiddenException);
    });

    it("throws AppNotFoundException when note does not exist", async () => {
      await expect(
        service.updateNote(
          "app-1",
          "note-999",
          { content: "No note" },
          mockUser,
        ),
      ).rejects.toThrow(AppNotFoundException);
    });
  });

  describe("deleteNote", () => {
    it("allows the original author to delete their note", async () => {
      const res = await service.deleteNote("app-1", "note-1", mockUser);
      expect(res).toEqual({ success: true, id: "note-1" });
    });

    it("allows ADMIN to delete any note", async () => {
      const res = await service.deleteNote("app-1", "note-1", mockAdminUser);
      expect(res).toEqual({ success: true, id: "note-1" });
    });

    it("throws AppForbiddenException when another user tries to delete note", async () => {
      await expect(
        service.deleteNote("app-1", "note-1", otherUser),
      ).rejects.toThrow(AppForbiddenException);
    });

    it("throws AppNotFoundException when note does not exist", async () => {
      await expect(
        service.deleteNote("app-1", "note-999", mockUser),
      ).rejects.toThrow(AppNotFoundException);
    });
  });
});
