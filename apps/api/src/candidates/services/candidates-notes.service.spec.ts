import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  CandidatesNotesService,
  type AuthenticatedUser,
} from "./candidates-notes.service";
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

describe("CandidatesNotesService", () => {
  let service: CandidatesNotesService;
  let candidateTable: MockTable<Record<string, unknown>>;
  let candidateNoteTable: MockTable<Record<string, unknown>>;
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
    candidateTable = createMockTable([
      {
        id: "cand-1",
        organizationId: "org-1",
        name: "Nguyen Van A",
        email: "nguyen@example.com",
      },
      {
        id: "cand-other-org",
        organizationId: "org-2",
        name: "Foreign Candidate",
        email: "foreign@example.com",
      },
    ]);

    candidateNoteTable = createMockTable([
      {
        id: "note-1",
        organizationId: "org-1",
        candidateId: "cand-1",
        authorId: "user-1",
        authorName: "Jane Recruiter",
        authorRole: "RECRUITER",
        content: "Top tier candidate for tech lead",
        isEdited: false,
        createdAt: new Date("2026-11-01T10:00:00Z"),
        updatedAt: new Date("2026-11-01T10:00:00Z"),
      },
      {
        id: "note-2",
        organizationId: "org-1",
        candidateId: "cand-1",
        authorId: "user-2",
        authorName: "Other User",
        authorRole: "INTERVIEWER",
        content: "Good English communication",
        isEdited: false,
        createdAt: new Date("2026-11-02T10:00:00Z"),
        updatedAt: new Date("2026-11-02T10:00:00Z"),
      },
    ]);

    mockPrisma = createMockPrismaService({
      candidate: candidateTable,
      candidateNote: candidateNoteTable,
    }) as unknown as PrismaService;

    mockActivities = {
      createActivity: vi.fn().mockResolvedValue({ id: "act-1" }),
    };

    service = new CandidatesNotesService(
      mockPrisma,
      mockActivities as ActivitiesService,
    );
  });

  describe("findNotes", () => {
    it("returns candidate notes ordered by createdAt desc", async () => {
      const notes = await service.findNotes("cand-1", mockUser);
      expect(notes).toHaveLength(2);
    });

    it("throws AppNotFoundException if candidate does not exist", async () => {
      await expect(service.findNotes("non-existent", mockUser)).rejects.toThrow(
        AppNotFoundException,
      );
    });

    it("throws AppForbiddenException when tenant org mismatches candidate org", async () => {
      await expect(
        service.findNotes("cand-other-org", mockUser),
      ).rejects.toThrow(AppForbiddenException);
    });
  });

  describe("createNote", () => {
    it("creates a candidate note and logs an activity", async () => {
      const note = await service.createNote(
        "cand-1",
        { content: "Promising candidate for future senior roles" },
        mockUser,
      );

      expect(note).toBeDefined();
      expect(note.content).toBe("Promising candidate for future senior roles");
      expect(note.authorId).toBe(mockUser.id);
      expect(note.organizationId).toBe(mockUser.organizationId);
      expect(mockActivities.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "NOTE_ADDED",
          candidateId: "cand-1",
          organizationId: "org-1",
        }),
      );
    });

    it("throws AppForbiddenException if user org does not match candidate org", async () => {
      await expect(
        service.createNote(
          "cand-other-org",
          { content: "Should fail" },
          mockUser,
        ),
      ).rejects.toThrow(AppForbiddenException);
    });
  });

  describe("updateNote", () => {
    it("allows the note author to update their note", async () => {
      const updated = await service.updateNote(
        "cand-1",
        "note-1",
        { content: "Updated feedback after screening" },
        mockUser,
      );

      expect(updated.content).toBe("Updated feedback after screening");
      expect(updated.isEdited).toBe(true);
    });

    it("allows an admin to update any note in their org", async () => {
      const updated = await service.updateNote(
        "cand-1",
        "note-1",
        { content: "Admin corrected typo" },
        mockAdminUser,
      );

      expect(updated.content).toBe("Admin corrected typo");
      expect(updated.isEdited).toBe(true);
    });

    it("denies another non-admin user from updating someone else's note", async () => {
      await expect(
        service.updateNote(
          "cand-1",
          "note-1",
          { content: "Malicious update" },
          otherUser,
        ),
      ).rejects.toThrow(AppForbiddenException);
    });
  });

  describe("deleteNote", () => {
    it("allows the note author to delete their note", async () => {
      const res = await service.deleteNote("cand-1", "note-1", mockUser);
      expect(res.success).toBe(true);
    });

    it("allows an admin to delete any note", async () => {
      const res = await service.deleteNote("cand-1", "note-1", mockAdminUser);
      expect(res.success).toBe(true);
    });

    it("denies another non-admin user from deleting someone else's note", async () => {
      await expect(
        service.deleteNote("cand-1", "note-1", otherUser),
      ).rejects.toThrow(AppForbiddenException);
    });
  });
});
