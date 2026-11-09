import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanupOrphans,
  extractObjectNameFromUrl,
} from "./orphan-cleanup";
import { EventEmitter } from "node:events";
import type * as Minio from "minio";

describe("orphan-cleanup", () => {
  describe("extractObjectNameFromUrl", () => {
    it("extracts object key from full http URL", () => {
      const url = "http://localhost:9000/haihire-resumes/tenants/org-1/resumes/doc1.pdf";
      expect(extractObjectNameFromUrl(url, "haihire-resumes")).toBe(
        "tenants/org-1/resumes/doc1.pdf",
      );
    });

    it("extracts object key from relative path with leading slash", () => {
      const path = "/haihire-resumes/tenants/org-2/resumes/doc2.pdf";
      expect(extractObjectNameFromUrl(path, "haihire-resumes")).toBe(
        "tenants/org-2/resumes/doc2.pdf",
      );
    });

    it("returns empty string when url is empty or whitespace", () => {
      expect(extractObjectNameFromUrl("")).toBe("");
      expect(extractObjectNameFromUrl("   ")).toBe("");
    });
  });

  describe("cleanupOrphans safety and execution", () => {
    let mockMinioClient: {
      listObjects: ReturnType<typeof vi.fn>;
      removeObject: ReturnType<typeof vi.fn>;
    };

    const createMockStream = (
      items: Array<{ name: string; size?: number; lastModified?: Date }>,
    ) => {
      const emitter = new EventEmitter();
      process.nextTick(() => {
        for (const item of items) {
          emitter.emit("data", item);
        }
        emitter.emit("end");
      });
      return emitter;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockMinioClient = {
        listObjects: vi.fn(),
        removeObject: vi.fn().mockResolvedValue(undefined),
      };
    });

    it("aborts and throws immediately if CandidateDocument query fails (F01 safety lock)", async () => {
      // Arrange
      const mockDb = {
        candidateDocument: {
          findMany: vi.fn().mockRejectedValue(new Error("PostgreSQL timeout")),
        },
      };

      // Act & Assert
      await expect(
        cleanupOrphans({
          dbClient: mockDb,
          minioClient: mockMinioClient as unknown as Minio.Client,
        }),
      ).rejects.toThrow(
        /MinIO Orphan Cleanup aborted: Failed to query CandidateDocument references: PostgreSQL timeout/,
      );

      // Verify no MinIO deletion or stream occurred
      expect(mockMinioClient.removeObject).not.toHaveBeenCalled();
      expect(mockMinioClient.listObjects).not.toHaveBeenCalled();
    });

    it("aborts and throws immediately if Application query fails (F01 safety lock)", async () => {
      // Arrange
      const mockDb = {
        candidateDocument: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        application: {
          findMany: vi.fn().mockRejectedValue(new Error("Connection reset by peer")),
        },
      };

      // Act & Assert
      await expect(
        cleanupOrphans({
          dbClient: mockDb,
          minioClient: mockMinioClient as unknown as Minio.Client,
        }),
      ).rejects.toThrow(
        /MinIO Orphan Cleanup aborted: Failed to query Application references: Connection reset by peer/,
      );

      expect(mockMinioClient.removeObject).not.toHaveBeenCalled();
      expect(mockMinioClient.listObjects).not.toHaveBeenCalled();
    });

    it("aborts and throws immediately if Candidate query fails (F01 safety lock)", async () => {
      // Arrange
      const mockDb = {
        candidateDocument: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        application: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        candidate: {
          findMany: vi.fn().mockRejectedValue(new Error("Deadlock detected")),
        },
      };

      // Act & Assert
      await expect(
        cleanupOrphans({
          dbClient: mockDb,
          minioClient: mockMinioClient as unknown as Minio.Client,
        }),
      ).rejects.toThrow(
        /MinIO Orphan Cleanup aborted: Failed to query Candidate references: Deadlock detected/,
      );

      expect(mockMinioClient.removeObject).not.toHaveBeenCalled();
      expect(mockMinioClient.listObjects).not.toHaveBeenCalled();
    });

    it("successfully deletes orphans older than threshold and preserves referenced or grace period files", async () => {
      // Arrange
      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const mockDb = {
        candidateDocument: {
          findMany: vi.fn().mockResolvedValue([
            { url: "tenants/org-1/resumes/active-ref.pdf" },
          ]),
        },
        application: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        candidate: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const items = [
        { name: "tenants/org-1/resumes/active-ref.pdf", size: 1024, lastModified: fortyDaysAgo },
        { name: "tenants/org-1/resumes/recent-orphan.pdf", size: 2048, lastModified: fiveDaysAgo },
        { name: "tenants/org-1/resumes/old-orphan.pdf", size: 4096, lastModified: fortyDaysAgo },
      ];

      mockMinioClient.listObjects.mockReturnValue(createMockStream(items));

      // Act
      const report = await cleanupOrphans({
        dryRun: false,
        thresholdDays: 30,
        dbClient: mockDb,
        minioClient: mockMinioClient as unknown as Minio.Client,
      });

      // Assert
      expect(report.scannedCount).toBe(3);
      expect(report.dbRefCount).toBe(1);
      expect(report.orphanCount).toBe(2);
      expect(report.preservedGraceCount).toBe(1);
      expect(report.deletedCount).toBe(1);
      expect(report.bytesFreed).toBe(4096);
      expect(report.deletedFiles).toEqual(["tenants/org-1/resumes/old-orphan.pdf"]);
      expect(report.preservedFiles).toEqual(["tenants/org-1/resumes/recent-orphan.pdf"]);

      expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(1);
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        "haihire-resumes",
        "tenants/org-1/resumes/old-orphan.pdf",
      );
    });

    it("does not delete files when dryRun is true", async () => {
      // Arrange
      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const mockDb = {
        candidateDocument: { findMany: vi.fn().mockResolvedValue([]) },
        application: { findMany: vi.fn().mockResolvedValue([]) },
        candidate: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const items = [
        { name: "tenants/org-1/resumes/old-orphan.pdf", size: 4096, lastModified: fortyDaysAgo },
      ];

      mockMinioClient.listObjects.mockReturnValue(createMockStream(items));

      // Act
      const report = await cleanupOrphans({
        dryRun: true,
        thresholdDays: 30,
        dbClient: mockDb,
        minioClient: mockMinioClient as unknown as Minio.Client,
      });

      // Assert
      expect(report.deletedCount).toBe(1);
      expect(mockMinioClient.removeObject).not.toHaveBeenCalled();
    });
  });
});
