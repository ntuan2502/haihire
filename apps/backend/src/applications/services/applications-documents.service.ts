import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  type CandidateDocument,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { MinioService } from "../../minio/minio.service";
import { ActivitiesService } from "../../activities/activities.service";
import { validateUploadedFile, sanitizeFilename } from "../../common/upload-utils";
import { fixUtf8String } from "../../common/doc-utils";
import { toTimestamp, toInstant } from "../../common/date.util";
import { ApplicationsQueryService } from "./applications-query.service";

@Injectable()
export class ApplicationsDocumentsService {
  private readonly query: ApplicationsQueryService;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
    @Optional()
    @Inject(ApplicationsQueryService)
    queryService?: ApplicationsQueryService,
  ) {
    this.query = queryService || new ApplicationsQueryService(prisma, activitiesService);
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    documentType = "Resume",
    tenantOrgId?: string | null,
  ) {
    const existing = await this.query.findOne(id, tenantOrgId);

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
    } = {
      url: `/uploads/${Date.now()}-${cleanOriginalName}`,
      originalName: cleanOriginalName,
      size: file.size || 0,
      mimeType: file.mimetype || "application/pdf",
    };

    const targetOrgId = existing.job?.organizationId || tenantOrgId;

    try {
      uploadResult = await this.minioService.uploadFile(file, "resumes", targetOrgId);
      uploadResult.originalName = cleanOriginalName;
    } catch {
      uploadResult = {
        url: `/uploads/${Date.now()}-${cleanOriginalName}`,
        originalName: cleanOriginalName,
        size: file.size,
        mimeType: file.mimetype,
      };
    }

    const newDocId = crypto.randomUUID();
    const cleanDocName = fixUtf8String(uploadResult.originalName);

    if (existing.candidateId) {
      try {
        const cand = await this.prisma.db.orm.public.Candidate.select("id", "organizationId")
          .where((c) => c.id.eq(existing.candidateId))
          .first();
        if (cand) {
          await this.prisma.db.orm.public.CandidateDocument.create({
            id: newDocId,
            candidateId: cand.id,
            organizationId: cand.organizationId,
            name: cleanDocName,
            url: uploadResult.url,
            size: uploadResult.size ?? null,
            mimeType: uploadResult.mimeType ?? null,
            type: documentType || "Resume",
            updatedAt: toInstant(),
          });
        }
      } catch {
        // ignore if mock or table unavailable in test
      }
    }

    await this.prisma.db.orm.public.Application.where(
      (a) => a.id.eq(id),
    ).update({
      resumeUrl: uploadResult.url,
      resumeFileName: cleanDocName,
      resumeFileSize: uploadResult.size ?? null,
      resumeMimeType: uploadResult.mimeType ?? null,
    });

    return this.query.findOne(id, tenantOrgId);
  }

  async prepareDocumentDownload(
    id: string,
    targetUrl?: string,
    targetName?: string,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string } | null,
  ) {
    const app = await this.query.findOne(id, tenantOrgId);

    const downloadUrl = targetUrl || app.resumeUrl;
    if (!downloadUrl) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Document not found",
      );
    }

    // SSRF prevention: Verify that targetUrl belongs to this application
    if (targetUrl) {
      const allowedUrls: string[] = [];
      if (app.resumeUrl) allowedUrls.push(app.resumeUrl);
      if (app.candidate?.resumeUrl) allowedUrls.push(app.candidate.resumeUrl);
      if (app.candidateId) {
        try {
          const candDocs = await this.getCandidateDocuments(app.candidateId);
          for (const doc of candDocs) {
            if (doc?.url) allowedUrls.push(doc.url);
          }
        } catch {
          // ignore
        }
      }

      const targetObj = this.minioService.extractObjectName(targetUrl);
      const isAllowed = allowedUrls.some(
        (u) => u === targetUrl || this.minioService.extractObjectName(u) === targetObj,
      );
      if (!isAllowed) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
          "Access denied: specified document does not belong to this application.",
          { id },
        );
      }
    }

    const rawName = targetName || app.resumeFileName || "document.pdf";
    const cleanFileName = fixUtf8String(rawName);
    const asciiFallback = cleanFileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedFileName = encodeURIComponent(cleanFileName);

    let stream: NodeJS.ReadableStream;
    try {
      stream = await this.minioService.getObjectStream(downloadUrl);
    } catch {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_RETRIEVE_FAILED,
        "Document file could not be retrieved from storage",
      );
    }

    if (currentUser?.id && app.candidateId && this.activitiesService) {
      const appOrgId = app?.job?.organizationId || app?.candidate?.organizationId || "default";
      this.activitiesService
        .createActivity({
          organizationId: appOrgId,
          candidateId: app.candidateId,
          applicationId: app.id,
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
            applicationId: app.id,
          },
        })
        .catch(() => {});
    }

    return {
      app,
      downloadUrl,
      cleanFileName,
      asciiFallback,
      encodedFileName,
      mimeType: app.resumeMimeType,
      stream,
    };
  }

  async deleteDocument(
    id: string,
    opts?: { documentId?: string; url?: string },
    tenantOrgId?: string | null,
  ) {
    await this.query.findOne(id, tenantOrgId);

    if (opts?.documentId) {
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.id.eq(opts.documentId!)).delete();
      } catch {}
    } else if (opts?.url) {
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.url.eq(opts.url!)).delete();
      } catch {}
    }

    await this.prisma.db.orm.public.Application.where(
      (a) => a.id.eq(id),
    ).update({
      resumeUrl: null,
      resumeFileName: null,
      resumeFileSize: null,
      resumeMimeType: null,
    });

    return this.query.findOne(id, tenantOrgId);
  }

  async getCandidateDocuments(candidateId: string): Promise<CandidateDocument[]> {
    try {
      const queried = await this.prisma.db.orm.public.CandidateDocument.select(
        "id",
        "candidateId",
        "organizationId",
        "name",
        "url",
        "size",
        "mimeType",
        "type",
        "createdAt",
      )
        .where((d) => d.candidateId.eq(candidateId))
        .all();
      return queried.map((d) => ({
        ...d,
        createdAt: d.createdAt ? new Date(toTimestamp(d.createdAt)).toISOString() : new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }
}
