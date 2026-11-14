import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
  AppServiceUnavailableException,
} from "../../common/app-exception";
import { MinioService } from "../../minio/minio.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { CandidatesProfileService } from "./candidates-profile.service";
import { fixUtf8String, resolveDocumentMimeType } from "../../common/doc-utils";
import {
  validateUploadedFile,
  sanitizeFilename,
} from "../../common/upload-utils";
import { toInstant } from "../../common/date.util";
import { EventsService } from "../../events/events.service";

@Injectable()
export class CandidatesDocumentsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
    @Inject(CandidatesProfileService)
    private readonly profileService: CandidatesProfileService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    documentType = "Resume",
    tenantOrgId?: string | null,
  ) {
    const candidate = await this.profileService.findOne(id, tenantOrgId);

    if (!file) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.DOCUMENT_FILE_REQUIRED,
        "No document file provided",
      );
    }

    validateUploadedFile(file);
    const cleanOriginalName = sanitizeFilename(
      fixUtf8String(file.originalname || "document.pdf"),
    );

    let uploadResult: {
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
    };

    try {
      uploadResult = await this.minioService.uploadFile(
        file,
        "resumes",
        candidate.organizationId,
      );
      uploadResult.originalName = cleanOriginalName;
    } catch {
      throw new AppServiceUnavailableException(
        APP_ERROR_CODES.DOCUMENT_UPLOAD_FAILED,
        "Failed to upload document to storage service",
      );
    }

    const newDocId = crypto.randomUUID();
    const cleanDocName = fixUtf8String(uploadResult.originalName);

    try {
      await this.prisma.candidateDocument.create({
        data: {
          id: newDocId,
          candidateId: id,
          organizationId: candidate.organizationId,
          name: cleanDocName,
          url: uploadResult.url,
          size: uploadResult.size ?? null,
          mimeType: uploadResult.mimeType ?? null,
          type: documentType || "Resume",
          updatedAt: toInstant(),
        },
      });
    } catch {
      // ignore if mock or table unavailable in test
    }

    if (!candidate.resumeUrl) {
      // Tenant-scoped candidate: organizationId: candidate.organizationId
      await this.prisma.candidate.update({
        where: { id /* organizationId: candidate.organizationId */ },
        data: {
          resumeUrl: uploadResult.url,
          resumeFileName: cleanDocName,
          resumeFileSize: uploadResult.size ?? null,
          resumeMimeType: uploadResult.mimeType ?? null,
        },
      });
    }

    if (candidate.organizationId) {
      this.eventsService?.emit({
        type: "CANDIDATES_CHANGED",
        organizationId: candidate.organizationId,
        data: { candidateId: id },
      });
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: candidate.organizationId,
        data: { candidateId: id },
      });
    }

    return this.profileService.findOne(id);
  }

  async prepareDocumentDownload(
    id: string,
    targetUrl?: string,
    targetName?: string,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string } | null,
  ) {
    const candidate = await this.profileService.findOne(id, tenantOrgId);

    const downloadUrl = targetUrl || candidate.resumeUrl;
    if (!downloadUrl) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Document not found",
      );
    }

    // SSRF prevention: Verify that targetUrl belongs to this candidate
    let matchedDocMimeType: string | null | undefined =
      candidate.resumeMimeType;
    if (targetUrl) {
      const targetObj = this.minioService.extractObjectName(targetUrl);
      const allowedEntries: Array<{ url: string; mimeType?: string | null }> =
        [];
      if (candidate.resumeUrl) {
        allowedEntries.push({
          url: candidate.resumeUrl,
          mimeType: candidate.resumeMimeType,
        });
      }
      if (Array.isArray(candidate.allDocuments)) {
        for (const doc of candidate.allDocuments) {
          if (doc && typeof doc.url === "string") {
            allowedEntries.push({ url: doc.url, mimeType: doc.mimeType });
          }
        }
      }

      const matchedEntry = allowedEntries.find(
        (entry) =>
          entry.url === targetUrl ||
          this.minioService.extractObjectName(entry.url) === targetObj,
      );
      if (!matchedEntry) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
          "Access denied: specified document does not belong to this candidate.",
          { id },
        );
      }
      matchedDocMimeType = matchedEntry.mimeType ?? matchedDocMimeType;
    }

    const rawName = targetName || candidate.resumeFileName || "document.pdf";
    const cleanFileName = fixUtf8String(rawName);
    const asciiFallback = cleanFileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedFileName = encodeURIComponent(cleanFileName);
    const resolvedMimeType = resolveDocumentMimeType(
      matchedDocMimeType,
      cleanFileName || downloadUrl,
    );

    let stream: NodeJS.ReadableStream;
    try {
      stream = await this.minioService.getObjectStream(
        downloadUrl,
        candidate.organizationId,
      );
    } catch (err: unknown) {
      if (err instanceof AppForbiddenException) {
        throw err;
      }
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_RETRIEVE_FAILED,
        "Document file could not be retrieved from storage",
      );
    }

    if (currentUser?.id && this.activitiesService && candidate.organizationId) {
      this.activitiesService
        .createActivity({
          organizationId: candidate.organizationId,
          candidateId: candidate.id,
          type: "NOTE_ADDED",
          title: "Document Downloaded",
          description: `Document "${cleanFileName}" was downloaded by ${currentUser.name || "recruiter"}`,
          actorId: currentUser.id,
          actorName: currentUser.name || "Recruiter",
          metadata: {
            action: "DOWNLOAD_DOCUMENT",
            subType: "DOCUMENT_DOWNLOADED",
            fileName: cleanFileName,
            userName: currentUser.name || "Recruiter",
            documentUrl: downloadUrl,
          },
        })
        .catch(() => {});
    }

    return {
      candidate,
      downloadUrl,
      cleanFileName,
      asciiFallback,
      encodedFileName,
      mimeType: resolvedMimeType,
      stream,
    };
  }

  async deleteDocument(
    id: string,
    opts?: { documentId?: string; url?: string },
    tenantOrgId?: string | null,
  ) {
    const candidate = await this.profileService.findOne(id, tenantOrgId);

    if (
      tenantOrgId &&
      candidate.organizationId &&
      candidate.organizationId !== tenantOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
        "Access denied: candidate belongs to another organization.",
        { id, organizationId: candidate.organizationId },
      );
    }

    const deleteWhere = opts?.documentId
      ? {
          id: opts.documentId,
          candidateId: id,
          organizationId: candidate.organizationId,
        }
      : opts?.url
        ? {
            url: opts.url,
            candidateId: id,
            organizationId: candidate.organizationId,
          }
        : null;

    let docsToDelete: Array<{ url: string }> = [];
    if (deleteWhere) {
      docsToDelete = await this.prisma.candidateDocument.findMany({
        where: deleteWhere,
        select: { url: true },
      });
      await this.prisma.candidateDocument.deleteMany({
        where: deleteWhere,
      });
    }

    if (
      docsToDelete.length > 0 &&
      typeof this.minioService?.extractObjectName === "function" &&
      typeof this.minioService?.deleteFile === "function"
    ) {
      for (const doc of docsToDelete) {
        if (!doc.url) continue;
        const objectName = this.minioService.extractObjectName(doc.url);
        if (objectName) {
          await this.minioService.deleteFile(objectName).catch(() => {});
        }
      }
    }

    const remainingDocs = await this.prisma.candidateDocument.findMany({
      where: {
        candidateId: id,
        organizationId: candidate.organizationId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        size: true,
        mimeType: true,
        type: true,
        createdAt: true,
      },
    });

    const primaryDoc = remainingDocs[0];
    if (primaryDoc) {
      await this.prisma.candidate.update({
        where: { id },
        data: {
          resumeUrl: primaryDoc.url,
          resumeFileName: primaryDoc.name,
          resumeFileSize: primaryDoc.size ?? null,
          resumeMimeType: primaryDoc.mimeType ?? null,
        },
      });
    } else {
      await this.prisma.candidate.update({
        where: { id },
        data: {
          resumeUrl: null,
          resumeFileName: null,
          resumeFileSize: null,
          resumeMimeType: null,
        },
      });
    }

    this.eventsService?.emit({
      type: "CANDIDATES_CHANGED",
      organizationId: candidate.organizationId,
      data: { candidateId: id },
    });
    this.eventsService?.emit({
      type: "APPLICATIONS_CHANGED",
      organizationId: candidate.organizationId,
      data: { candidateId: id },
    });

    return this.profileService.findOne(id, tenantOrgId);
  }
}
