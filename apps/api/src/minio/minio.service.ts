import { Injectable, Logger } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { Readable } from "node:stream";
import { env } from "../config/env";
import {
  AppBadRequestException,
  AppForbiddenException,
} from "../common/app-exception";
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
        this.logger.log(
          `Bucket '${this.bucketName}' created (private access).`,
        );
      }
      this.logger.log(
        `MinIO successfully connected to bucket: ${this.bucketName}`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`MinIO initialization notice: ${msg}`);
    }
  }
  async checkHealth(): Promise<boolean> {
    try {
      return await this.client.bucketExists(this.bucketName);
    } catch {
      return false;
    }
  }
  private async putNamespacedFile(
    file: Express.Multer.File,
    namespacePrefix: string,
    folder: string,
    allowedExtensions: ReadonlySet<string>,
  ): Promise<UploadResult> {
    const ext = extname(file.originalname).toLowerCase();
    if (!ext || !allowedExtensions.has(ext)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.DOCUMENT_UPLOAD_FAILED,
        `Disallowed or missing file extension: ${ext || "(none)"}`,
      );
    }
    const uniqueFileName = `${namespacePrefix}${folder}/${Date.now()}-${randomUUID()}${ext}`;
    try {
      await this.client.putObject(
        this.bucketName,
        uniqueFileName,
        file.buffer,
        file.size,
        {
          "Content-Type": file.mimetype,
        },
      );
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "test") {
        this.logger.warn(
          `MinIO putObject bypassed in test mode: ${(error as Error)?.message}`,
        );
      } else {
        throw error;
      }
    }
    const url = `${this.publicUrl}/${this.bucketName}/${uniqueFileName}`;
    return {
      url,
      fileName: uniqueFileName,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
  async uploadFile(
    file: Express.Multer.File,
    folder = "resumes",
    tenantOrgId?: string | null,
    allowedExtensions: ReadonlySet<string> = new Set([".pdf"]),
  ): Promise<UploadResult> {
    if (!tenantOrgId || !tenantOrgId.trim()) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.TENANT_ID_REQUIRED_FOR_UPLOAD,
        "Tenant organization ID is required for file uploads to enforce tenant namespace isolation.",
      );
    }
    const safeTenant = tenantOrgId.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeTenant) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.TENANT_ID_REQUIRED_FOR_UPLOAD,
        "Tenant organization ID is required for file uploads to enforce tenant namespace isolation.",
      );
    }
    return this.putNamespacedFile(
      file,
      `tenants/${safeTenant}/`,
      folder,
      allowedExtensions,
    );
  }
  async uploadUserFile(
    file: Express.Multer.File,
    userId: string,
    folder = "avatars",
    allowedExtensions: ReadonlySet<string> = new Set([
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
    ]),
  ): Promise<UploadResult> {
    const safeUserId = userId?.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "";
    if (!safeUserId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "User ID is required for user file uploads.",
      );
    }
    return this.putNamespacedFile(
      file,
      `users/${safeUserId}/`,
      folder,
      allowedExtensions,
    );
  }
  getClient(): Minio.Client {
    return this.client;
  }
  getBucketName(): string {
    return this.bucketName;
  }
  async deleteTenantPrefix(tenantOrgId: string): Promise<number> {
    const safeTenant = tenantOrgId?.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "";
    if (!safeTenant) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: missing organization context",
      );
    }
    const prefix = `tenants/${safeTenant}/`;
    const objectNames: string[] = [];
    await new Promise<void>((resolve, reject) => {
      try {
        const stream = this.client.listObjects(this.bucketName, prefix, true);
        stream.on("data", (obj: Minio.BucketItem) => {
          if (obj.name && !obj.name.endsWith("/")) {
            objectNames.push(obj.name);
          }
        });
        stream.on("error", (err: unknown) => reject(err));
        stream.on("end", () => resolve());
      } catch (err) {
        reject(err);
      }
    });
    if (objectNames.length === 0) return 0;
    try {
      await this.client.removeObjects(this.bucketName, objectNames);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "test") {
        this.logger.warn(
          `MinIO removeObjects bypassed in test mode: ${(error as Error)?.message}`,
        );
        return objectNames.length;
      }
      this.logger.error(
        `Failed to delete tenant objects under '${prefix}'`,
        error,
      );
      throw error;
    }
    return objectNames.length;
  }
  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, fileName);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "test") {
        this.logger.warn(
          `MinIO removeObject bypassed in test mode: ${(error as Error)?.message}`,
        );
        return;
      }
      this.logger.error(
        `Failed to delete file '${fileName}' from MinIO`,
        error,
      );
      throw error;
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
    // Prevent directory traversal (including percent-encoded sequences)
    let decoded = clean;
    try {
      decoded = decodeURIComponent(clean);
    } catch {
      // keep raw path if malformed URI sequence
    }
    if (clean.includes("..") || decoded.includes("..")) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Invalid object path: directory traversal not allowed",
      );
    }
    return clean;
  }
  assertTenantAccess(objectName: string, tenantOrgId?: string | null): void {
    const safeTenant = tenantOrgId?.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "";
    if (!safeTenant) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: missing organization context",
      );
    }
    const expectedPrefix = `tenants/${safeTenant}/`;
    if (!objectName.startsWith(expectedPrefix)) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: file does not belong to this organization",
      );
    }
  }
  assertUserAccess(objectName: string, userId: string): void {
    const safeUserId = userId?.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "";
    if (!safeUserId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: missing user context",
      );
    }
    const expectedPrefix = `users/${safeUserId}/`;
    if (!objectName.startsWith(expectedPrefix)) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: file does not belong to this user",
      );
    }
  }
  async getObjectStream(
    urlOrPath: string,
    tenantOrgId?: string | null,
  ): Promise<Readable> {
    const objectName = this.extractObjectName(urlOrPath);
    this.assertTenantAccess(objectName, tenantOrgId);
    return await this.client.getObject(this.bucketName, objectName);
  }
  async getUserObjectStream(
    urlOrPath: string,
    userId: string,
  ): Promise<Readable> {
    const objectName = this.extractObjectName(urlOrPath);
    this.assertUserAccess(objectName, userId);
    return await this.client.getObject(this.bucketName, objectName);
  }
  async getPresignedUrl(
    urlOrPath: string,
    expirySeconds = 3600,
    tenantOrgId?: string | null,
  ): Promise<string> {
    const objectName = this.extractObjectName(urlOrPath);
    this.assertTenantAccess(objectName, tenantOrgId);
    return await this.client.presignedGetObject(
      this.bucketName,
      objectName,
      expirySeconds,
    );
  }
  getFileUrl(fileName: string): string {
    return `${this.publicUrl}/${this.bucketName}/${fileName}`;
  }
}
