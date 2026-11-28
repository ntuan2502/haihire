import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger } from "@nestjs/common";
import { cleanupOrphans, extractObjectNameFromUrl } from "./orphan-cleanup";
import { EventEmitter } from "node:events";
import type * as Minio from "minio";

describe("orphan-cleanup", () => {
  describe("extractObjectNameFromUrl", () => {
    it("extracts object key from full http URL", () => {
      const url =
        "http://localhost:9000/haihire-resumes/tenants/org-1/resumes/doc1.pdf";
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
          findMany: vi
            .fn()
            .mockRejectedValue(new Error("Connection reset by peer")),
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
          findMany: vi
            .fn()
            .mockResolvedValue([
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
        {
          name: "tenants/org-1/resumes/active-ref.pdf",
          size: 1024,
          lastModified: fortyDaysAgo,
        },
        {
          name: "tenants/org-1/resumes/recent-orphan.pdf",
          size: 2048,
          lastModified: fiveDaysAgo,
        },
        {
          name: "tenants/org-1/resumes/old-orphan.pdf",
          size: 4096,
          lastModified: fortyDaysAgo,
        },
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
      expect(report.deletedFiles).toEqual([
        "tenants/org-1/resumes/old-orphan.pdf",
      ]);
      expect(report.preservedFiles).toEqual([
        "tenants/org-1/resumes/recent-orphan.pdf",
      ]);

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
        {
          name: "tenants/org-1/resumes/old-orphan.pdf",
          size: 4096,
          lastModified: fortyDaysAgo,
        },
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

    it("preserves active organization logos referenced via logoObjectKey while removing stale replaced logos", async () => {
      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const mockDb = {
        candidateDocument: { findMany: vi.fn().mockResolvedValue([]) },
        application: { findMany: vi.fn().mockResolvedValue([]) },
        candidate: { findMany: vi.fn().mockResolvedValue([]) },
        organization: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { logoObjectKey: "tenants/org-1/logos/current-logo.png" },
            ]),
        },
      };

      const items = [
        {
          name: "tenants/org-1/logos/current-logo.png",
          size: 5120,
          lastModified: fortyDaysAgo,
        },
        {
          name: "tenants/org-1/logos/replaced-old-logo.png",
          size: 2048,
          lastModified: fortyDaysAgo,
        },
      ];

      mockMinioClient.listObjects.mockReturnValue(createMockStream(items));

      const report = await cleanupOrphans({
        dryRun: false,
        thresholdDays: 30,
        dbClient: mockDb,
        minioClient: mockMinioClient as unknown as Minio.Client,
      });

      expect(report.deletedFiles).toEqual([
        "tenants/org-1/logos/replaced-old-logo.png",
      ]);
      expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(1);
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        "haihire-resumes",
        "tenants/org-1/logos/replaced-old-logo.png",
      );
    });

    it("preserves active user avatars referenced via avatarObjectKey while removing stale replaced avatars", async () => {
      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const mockDb = {
        candidateDocument: { findMany: vi.fn().mockResolvedValue([]) },
        application: { findMany: vi.fn().mockResolvedValue([]) },
        candidate: { findMany: vi.fn().mockResolvedValue([]) },
        organization: { findMany: vi.fn().mockResolvedValue([]) },
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { avatarObjectKey: "users/usr-1/avatars/current-avatar.webp" },
            ]),
        },
      };

      const items = [
        {
          name: "users/usr-1/avatars/current-avatar.webp",
          size: 3072,
          lastModified: fortyDaysAgo,
        },
        {
          name: "users/usr-1/avatars/stale-avatar.webp",
          size: 2048,
          lastModified: fortyDaysAgo,
        },
      ];

      mockMinioClient.listObjects.mockReturnValue(createMockStream(items));

      const report = await cleanupOrphans({
        dryRun: false,
        thresholdDays: 30,
        dbClient: mockDb,
        minioClient: mockMinioClient as unknown as Minio.Client,
      });

      expect(report.deletedFiles).toEqual([
        "users/usr-1/avatars/stale-avatar.webp",
      ]);
      expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(1);
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        "haihire-resumes",
        "users/usr-1/avatars/stale-avatar.webp",
      );
    });

    it("wraps reference queries inside withSystemRlsBypass when provided on dbClient", async () => {
      const txDb = {
        candidateDocument: { findMany: vi.fn().mockResolvedValue([]) },
        application: { findMany: vi.fn().mockResolvedValue([]) },
        candidate: { findMany: vi.fn().mockResolvedValue([]) },
        organization: { findMany: vi.fn().mockResolvedValue([]) },
      };
      const withSystemRlsBypass = vi.fn(
        async (fn: (tx: typeof txDb) => Promise<unknown>) => fn(txDb),
      );
      mockMinioClient.listObjects.mockReturnValue(createMockStream([]));

      await cleanupOrphans({
        dryRun: true,
        dbClient: { withSystemRlsBypass } as never,
        minioClient: mockMinioClient as unknown as Minio.Client,
      });

      expect(withSystemRlsBypass).toHaveBeenCalledTimes(1);
      expect(txDb.candidateDocument.findMany).toHaveBeenCalledTimes(1);
    });

    it("logs via Nest Logger and continues deleting remaining orphans when removeObject fails once", async () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const mockDb = {
        candidateDocument: { findMany: vi.fn().mockResolvedValue([]) },
        application: { findMany: vi.fn().mockResolvedValue([]) },
        candidate: { findMany: vi.fn().mockResolvedValue([]) },
        organization: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const items = [
        {
          name: "tenants/org-1/resumes/fail.pdf",
          size: 1024,
          lastModified: fortyDaysAgo,
        },
        {
          name: "tenants/org-1/resumes/ok.pdf",
          size: 2048,
          lastModified: fortyDaysAgo,
        },
      ];

      mockMinioClient.listObjects.mockReturnValue(createMockStream(items));
      mockMinioClient.removeObject
        .mockRejectedValueOnce(new Error("MinIO busy"))
        .mockResolvedValueOnce(undefined);

      const loggerErrorSpy = vi
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => {});

      const report = await cleanupOrphans({
        dryRun: false,
        thresholdDays: 30,
        dbClient: mockDb,
        minioClient: mockMinioClient as unknown as Minio.Client,
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to remove orphan object tenants/org-1/resumes/fail.pdf: MinIO busy",
        ),
      );
      expect(report.deletedFiles).toEqual(["tenants/org-1/resumes/ok.pdf"]);
      expect(report.deletedCount).toBe(1);
      loggerErrorSpy.mockRestore();
    });
  });
});
