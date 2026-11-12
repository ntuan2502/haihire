import { Injectable, Inject, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import {
  AppNotFoundException,
  AppForbiddenException,
} from "../../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import type { CreateCandidateNoteDto } from "../dto/create-candidate-note.dto";
import type { UpdateCandidateNoteDto } from "../dto/update-candidate-note.dto";
import { EventsService } from "../../events/events.service";

export interface AuthenticatedUser {
  id: string;
  sub?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string | null;
  isOwner?: boolean;
}

@Injectable()
export class CandidatesNotesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  async findNotes(
    candidateId: string,
    tenantOrgOrUser?: string | AuthenticatedUser | null,
  ) {
    const tenantOrgId =
      typeof tenantOrgOrUser === "object" && tenantOrgOrUser !== null
        ? (tenantOrgOrUser as AuthenticatedUser).organizationId
        : tenantOrgOrUser;

    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId },
      select: { id: true, organizationId: true },
    });

    if (!candidate) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
        `Candidate with ID ${candidateId} not found`,
        { candidateId },
      );
    }

    if (
      tenantOrgId &&
      candidate.organizationId &&
      tenantOrgId !== candidate.organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
        "Access denied: candidate belongs to another organization.",
        { candidateId, organizationId: candidate.organizationId },
      );
    }

    const targetOrgId = tenantOrgId || candidate.organizationId || "";

    return this.prisma.candidateNote.findMany({
      where: {
        candidateId,
        ...(targetOrgId ? { organizationId: targetOrgId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createNote(
    candidateId: string,
    dto: CreateCandidateNoteDto,
    user: {
      id: string;
      name?: string;
      role?: string;
      organizationId?: string | null;
    },
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId },
      select: { id: true, organizationId: true },
    });

    if (!candidate) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
        `Candidate with ID ${candidateId} not found`,
        { candidateId },
      );
    }

    if (
      user.organizationId &&
      candidate.organizationId &&
      user.organizationId !== candidate.organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
        "Access denied: cannot add notes to another organization's candidate.",
        { candidateId },
      );
    }

    const targetOrgId = user.organizationId || candidate.organizationId || "";

    const note = await this.prisma.candidateNote.create({
      data: {
        organizationId: targetOrgId,
        candidateId,
        authorId: user.id,
        authorName: user.name || "User",
        authorRole: user.role || "MEMBER",
        content: dto.content.trim(),
        isEdited: false,
      },
    });

    if (this.activitiesService && targetOrgId) {
      try {
        await this.activitiesService.createActivity({
          organizationId: targetOrgId,
          candidateId,
          type: "NOTE_ADDED",
          title: "Candidate Note Added",
          description: dto.content.trim(),
          actorId: user.id,
          actorName: user.name || "User",
          actorRole: user.role || "MEMBER",
        });
      } catch {
        // Ignore activity log failure
      }
    }

    if (targetOrgId) {
      this.eventsService?.emit({
        type: "CANDIDATES_CHANGED",
        organizationId: targetOrgId,
        data: { candidateId },
      });
      this.eventsService?.emit({
        type: "ACTIVITIES_CHANGED",
        organizationId: targetOrgId,
        data: { candidateId },
      });
    }

    return note;
  }

  async updateNote(
    candidateId: string,
    noteId: string,
    dto: UpdateCandidateNoteDto,
    user: {
      id: string;
      role?: string;
      isOwner?: boolean;
      organizationId?: string | null;
    },
  ) {
    const note = await this.prisma.candidateNote.findFirst({
      where: {
        id: noteId,
        candidateId,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      },
    });

    if (!note) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.RESOURCE_NOT_FOUND,
        `Note with ID ${noteId} not found`,
        { noteId, candidateId },
      );
    }

    const isAuthor = note.authorId === user.id;
    const isAdmin = user.isOwner || user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "You can only edit your own notes.",
      );
    }

    const updatedNote = await this.prisma.candidateNote.update({
      where: { id: noteId },
      data: {
        content: dto.content.trim(),
        isEdited: true,
      },
    });

    const orgId = note.organizationId || user.organizationId;
    if (orgId) {
      this.eventsService?.emit({
        type: "CANDIDATES_CHANGED",
        organizationId: orgId,
        data: { candidateId },
      });
    }

    return updatedNote;
  }

  async deleteNote(
    candidateId: string,
    noteId: string,
    user: {
      id: string;
      role?: string;
      isOwner?: boolean;
      organizationId?: string | null;
    },
  ) {
    const note = await this.prisma.candidateNote.findFirst({
      where: {
        id: noteId,
        candidateId,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      },
    });

    if (!note) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.RESOURCE_NOT_FOUND,
        `Note with ID ${noteId} not found`,
        { noteId, candidateId },
      );
    }

    const isAuthor = note.authorId === user.id;
    const isAdmin = user.isOwner || user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "You can only delete your own notes.",
      );
    }

    await this.prisma.candidateNote.delete({
      where: { id: noteId },
    });

    const orgId = note.organizationId || user.organizationId;
    if (orgId) {
      this.eventsService?.emit({
        type: "CANDIDATES_CHANGED",
        organizationId: orgId,
        data: { candidateId },
      });
    }

    return { success: true, message: "Note deleted successfully" };
  }
}
