import * as Minio from "minio";
import { db } from "../prisma/db";

export interface CleanupOptions {
  dryRun?: boolean;
  thresholdDays?: number;
  bucketName?: string;
  minioClient?: Minio.Client;
  dbClient?: typeof db;
}

export interface CleanupReport {
  scannedCount: number;
  dbRefCount: number;
  orphanCount: number;
  preservedGraceCount: number;
  deletedCount: number;
  bytesFreed: number;
  deletedFiles: string[];
  preservedFiles: string[];
}

export function extractObjectNameFromUrl(urlOrPath: string, bucket = "haihire-resumes"): string {
  if (!urlOrPath) return "";
  let clean = urlOrPath.trim();
  try {
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      const parsed = new URL(clean);
      clean = parsed.pathname;
    }
  } catch {
    // not a URL
  }
  clean = clean.replace(/\\/g, "/");
  clean = clean.replace(/^\/+/, "");
  if (clean.startsWith(`${bucket}/`)) {
    clean = clean.slice(bucket.length + 1);
  }
  return clean;
}

export async function cleanupOrphans(options: CleanupOptions = {}): Promise<CleanupReport> {
  const dryRun = options.dryRun ?? false;
  const thresholdDays = options.thresholdDays ?? 30;
  const bucketName = options.bucketName || process.env.MINIO_BUCKET_NAME || "haihire-resumes";

  const minioClient =
    options.minioClient ||
    new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: Number(process.env.MINIO_PORT || "19000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    });

  const activeDb = options.dbClient || db;

  // 1. Gather all active DB references for resume files
  const activeReferencedObjectNames = new Set<string>();

  try {
    const candidateDocs = await activeDb.orm.public.CandidateDocument.select("url").all();
    for (const doc of candidateDocs) {
      if (doc.url) {
        const objName = extractObjectNameFromUrl(doc.url, bucketName);
        if (objName) activeReferencedObjectNames.add(objName);
      }
    }
  } catch (err) {
    console.warn("Could not query CandidateDocument references:", err);
  }

  try {
    const apps = await activeDb.orm.public.Application.select("resumeUrl").all();
    for (const app of apps) {
      if (app.resumeUrl) {
        const objName = extractObjectNameFromUrl(app.resumeUrl, bucketName);
        if (objName) activeReferencedObjectNames.add(objName);
      }
    }
  } catch (err) {
    console.warn("Could not query Application references:", err);
  }

  try {
    const candidates = await activeDb.orm.public.Candidate.select("resumeUrl").all();
    for (const cand of candidates) {
      if (cand.resumeUrl) {
        const objName = extractObjectNameFromUrl(cand.resumeUrl, bucketName);
        if (objName) activeReferencedObjectNames.add(objName);
      }
    }
  } catch (err) {
    console.warn("Could not query Candidate references:", err);
  }

  // 2. Stream all objects from the bucket
  const scannedObjects: Array<{ name: string; size: number; lastModified: Date }> = [];

  await new Promise<void>((resolve, reject) => {
    try {
      const stream = minioClient.listObjects(bucketName, "tenants/", true);
      stream.on("data", (obj: Minio.BucketItem) => {
        if (obj.name && !obj.name.endsWith("/")) {
          scannedObjects.push({
            name: obj.name,
            size: obj.size || 0,
            lastModified: obj.lastModified ? new Date(obj.lastModified) : new Date(),
          });
        }
      });
      stream.on("error", (err: unknown) => reject(err));
      stream.on("end", () => resolve());
    } catch (streamErr) {
      reject(streamErr);
    }
  });

  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  const report: CleanupReport = {
    scannedCount: scannedObjects.length,
    dbRefCount: activeReferencedObjectNames.size,
    orphanCount: 0,
    preservedGraceCount: 0,
    deletedCount: 0,
    bytesFreed: 0,
    deletedFiles: [],
    preservedFiles: [],
  };

  for (const obj of scannedObjects) {
    const isReferenced = activeReferencedObjectNames.has(obj.name);

    if (isReferenced) {
      continue;
    }

    report.orphanCount++;
    const ageMs = now - obj.lastModified.getTime();

    if (ageMs < thresholdMs) {
      report.preservedGraceCount++;
      report.preservedFiles.push(obj.name);
      continue;
    }

    report.deletedCount++;
    report.bytesFreed += obj.size;
    report.deletedFiles.push(obj.name);

    if (!dryRun) {
      try {
        await minioClient.removeObject(bucketName, obj.name);
      } catch (delErr) {
        console.error(`Failed to remove orphan object ${obj.name}:`, delErr);
      }
    }
  }

  return report;
}
