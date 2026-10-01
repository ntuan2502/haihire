import { Injectable, Logger } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { Readable } from "node:stream";
import { env } from "../config/env";
import { AppBadRequestException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

export interface UploadResult {
  url: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.bucketName = env.MINIO_BUCKET_NAME;
    this.publicUrl = env.MINIO_PUBLIC_URL;

    this.client = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, "us-east-1");
        this.logger.log(`Bucket '${this.bucketName}' created (private access).`);
      }
      this.logger.log(`MinIO successfully connected to bucket: ${this.bucketName}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`MinIO initialization notice: ${msg}`);
    }
  }

  async uploadFile(file: Express.Multer.File, folder = "resumes", tenantOrgId?: string | null): Promise<UploadResult> {
    if (!tenantOrgId || !tenantOrgId.trim()) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.TENANT_ID_REQUIRED_FOR_UPLOAD,
        "Tenant organization ID is required for file uploads to enforce tenant namespace isolation.",
      );
    }
    const ext = extname(file.originalname).toLowerCase();
    const allowed = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"]);
    if (ext && !allowed.has(ext)) {
      throw new Error(`Disallowed file extension: ${ext}`);
    }
    const orgPrefix = `tenants/${tenantOrgId.trim()}/`;
    const uniqueFileName = `${orgPrefix}${folder}/${Date.now()}-${randomUUID()}${ext}`;

    await this.client.putObject(
      this.bucketName,
      uniqueFileName,
      file.buffer,
      file.size,
      {
        "Content-Type": file.mimetype,
      },
    );

    const url = `${this.publicUrl}/${this.bucketName}/${uniqueFileName}`;

    return {
      url,
      fileName: uniqueFileName,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, fileName);
    } catch (error: unknown) {
      this.logger.error(`Failed to delete file '${fileName}' from MinIO`, error);
    }
  }

  extractObjectName(urlOrPath: string): string {
    if (!urlOrPath) return "";
    let clean = urlOrPath.trim();
    try {
      if (clean.startsWith("http://") || clean.startsWith("https://")) {
        const parsed = new URL(clean);
        clean = parsed.pathname;
      }
    } catch {
      // not a full url, keep as path
    }
    // Normalize slashes
    clean = clean.replace(/\\/g, "/");
    // Strip leading slashes
    clean = clean.replace(/^\/+/, "");
    // Strip bucketName prefix if present
    if (clean.startsWith(`${this.bucketName}/`)) {
      clean = clean.slice(this.bucketName.length + 1);
    }
    // Prevent directory traversal
    if (clean.includes("..")) {
      throw new Error("Invalid object path: directory traversal not allowed");
    }
    return clean;
  }

  async getObjectStream(urlOrPath: string): Promise<Readable> {
    const objectName = this.extractObjectName(urlOrPath);
    return await this.client.getObject(this.bucketName, objectName);
  }

  async getPresignedUrl(urlOrPath: string, expirySeconds = 3600): Promise<string> {
    const objectName = this.extractObjectName(urlOrPath);
    return await this.client.presignedGetObject(this.bucketName, objectName, expirySeconds);
  }

  getFileUrl(fileName: string): string {
    return `${this.publicUrl}/${this.bucketName}/${fileName}`;
  }
}
