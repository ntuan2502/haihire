import { Injectable, Inject, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import {
  AppNotFoundException,
  AppForbiddenException,
} from "../../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import type { CreateApplicationNoteDto } from "../dto/create-application-note.dto";
import type { UpdateApplicationNoteDto } from "../dto/update-application-note.dto";

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
export class ApplicationsNotesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
  ) {}

  async findNotes(
    applicationId: string,
    tenantOrgOrUser?: string | AuthenticatedUser | null,
  ) {
    const tenantOrgId =
      typeof tenantOrgOrUser === "object" && tenantOrgOrUser !== null
        ? (tenantOrgOrUser as AuthenticatedUser).organizationId
        : tenantOrgOrUser;

    const app = await this.prisma.application.findFirst({
      where: { id: applicationId },
      include: {
        job: { select: { organizationId: true } },
        candidate: { select: { organizationId: true } },
      },
    });

    if (!app) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.APPLICATION_NOT_FOUND,
        `Application with ID ${applicationId} not found`,
        { applicationId },
      );
    }

    const appOrgId =
      (app as { organizationId?: string }).organizationId ||
      app.job?.organizationId ||
      app.candidate?.organizationId;
    if (tenantOrgId && appOrgId && tenantOrgId !== appOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: application belongs to another organization.",
        { applicationId, organizationId: appOrgId },
      );
    }

    const targetOrgId = tenantOrgId || appOrgId || "";

    const notes = await this.prisma.applicationNote.findMany({
      where: {
        applicationId,
        ...(targetOrgId ? { organizationId: targetOrgId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    // Auto-migrate legacy delimited notes string if no notes exist yet
    if (notes.length === 0 && app.notes && app.notes.trim()) {
      const items = app.notes.split(/\s*\|\s*|\n+/).filter(Boolean);
      if (items.length > 0 && targetOrgId) {
        const migrated = await Promise.all(
          items.map((item, index) =>
            this.prisma.applicationNote.create({
              data: {
                organizationId: targetOrgId,
                applicationId,
                authorId: app.candidateId,
                authorName: "System Note",
                authorRole: "SYSTEM",
                content: item.trim(),
                isEdited: false,
                createdAt: new Date(
                  Date.now() - (items.length - index) * 60000,
                ),
              },
            }),
          ),
        );
        return migrated.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
      }
    }

    return notes;
  }

  async createNote(
    applicationId: string,
    dto: CreateApplicationNoteDto,
    user: {
      id: string;
      name?: string;
      role?: string;
      organizationId?: string | null;
    },
  ) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId },
      include: {
        job: { select: { organizationId: true } },
        candidate: { select: { organizationId: true } },
      },
    });

    if (!app) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.APPLICATION_NOT_FOUND,
        `Application with ID ${applicationId} not found`,
        { applicationId },
      );
    }

    const appOrgId =
      (app as { organizationId?: string }).organizationId ||
      app.job?.organizationId ||
      app.candidate?.organizationId;
    if (user.organizationId && appOrgId && user.organizationId !== appOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: cannot add notes to another organization's application.",
        { applicationId },
      );
    }

    const targetOrgId = user.organizationId || appOrgId || "";

    const note = await this.prisma.applicationNote.create({
      data: {
        organizationId: targetOrgId,
        applicationId,
        authorId: user.id,
        authorName: user.name || "User",
        authorRole: user.role || "MEMBER",
        content: dto.content.trim(),
        isEdited: false,
      },
    });

    // Also update application.notes & candidate.notes with latest note content for backward compatibility
    try {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { notes: dto.content.trim() },
      });
    } catch {
      // Ignore background sync errors
    }

    // Record ActivityLog entry for timeline integration
    if (this.activitiesService && targetOrgId) {
      try {
        await this.activitiesService.createActivity({
          organizationId: targetOrgId,
          candidateId: app.candidateId,
          applicationId: app.id,
          type: "NOTE_ADDED",
          title: "Note Added",
          description: dto.content.trim(),
          actorId: user.id,
          actorName: user.name || "User",
          actorRole: user.role || "MEMBER",
        });
      } catch {
        // Ignore activity log failure
      }
    }

    return note;
  }

  async updateNote(
    applicationId: string,
    noteId: string,
    dto: UpdateApplicationNoteDto,
    user: {
      id: string;
      role?: string;
      isOwner?: boolean;
      organizationId?: string | null;
    },
  ) {
    const note = await this.prisma.applicationNote.findFirst({
      where: {
        id: noteId,
        applicationId,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      },
    });

    if (!note) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.RESOURCE_NOT_FOUND,
        `Note with ID ${noteId} not found`,
        { noteId, applicationId },
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

    return this.prisma.applicationNote.update({
      where: { id: noteId },
      data: {
        content: dto.content.trim(),
        isEdited: true,
      },
    });
  }

  async deleteNote(
    applicationId: string,
    noteId: string,
    user: {
      id: string;
      role?: string;
      isOwner?: boolean;
      organizationId?: string | null;
    },
  ) {
    const note = await this.prisma.applicationNote.findFirst({
      where: {
        id: noteId,
        applicationId,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      },
    });

    if (!note) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.RESOURCE_NOT_FOUND,
        `Note with ID ${noteId} not found`,
        { noteId, applicationId },
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

    await this.prisma.applicationNote.delete({
      where: { id: noteId },
    });

    return { success: true, id: noteId };
  }
}
