import { Injectable, Logger } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { env } from "../config/env";

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
        this.logger.log(`Bucket '${this.bucketName}' created.`);

        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetBucketLocation", "s3:ListBucket"],
              Resource: [`arn:aws:s3:::${this.bucketName}`],
            },
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      }
      this.logger.log(`MinIO successfully connected to bucket: ${this.bucketName}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`MinIO initialization notice: ${msg}`);
    }
  }

  async uploadFile(file: Express.Multer.File, folder = "resumes"): Promise<UploadResult> {
    const ext = extname(file.originalname);
    const uniqueFileName = `${folder}/${Date.now()}-${randomUUID()}${ext}`;

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

  getFileUrl(fileName: string): string {
    return `${this.publicUrl}/${this.bucketName}/${fileName}`;
  }
}
