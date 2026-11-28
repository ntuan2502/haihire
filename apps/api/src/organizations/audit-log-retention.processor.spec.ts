import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job, Queue } from "bullmq";
import {
  AUDIT_LOG_RETENTION_DLQ,
  AUDIT_LOG_RETENTION_SWEEP_JOB,
  AuditLogRetentionProcessor,
} from "./audit-log-retention.processor";
import type { OrganizationsAuditLogService } from "./services/organizations-audit-log.service";
import type { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";

describe("AuditLogRetentionProcessor", () => {
  let processor: AuditLogRetentionProcessor;
  let mockAuditLog: {
    purgeExpiredOrgLogs: ReturnType<typeof vi.fn>;
    purgeExpiredOperationalData: ReturnType<typeof vi.fn>;
  };
  let mockRetentionQueue: { upsertJobScheduler: ReturnType<typeof vi.fn> };
  let mockDlqQueue: { add: ReturnType<typeof vi.fn> };
  let mockWebhookNotifier: { notifyDlq: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuditLog = {
      purgeExpiredOrgLogs: vi
        .fn()
        .mockResolvedValue({ scannedOrgs: 2, deletedCount: 15 }),
      purgeExpiredOperationalData: vi.fn().mockResolvedValue({
        expiredSessions: 3,
        oldSecurityLogs: 5,
        oldNotifications: 7,
        processedOutboxEvents: 2,
      }),
    };
    mockRetentionQueue = {
      upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
    };
    mockDlqQueue = {
      add: vi.fn().mockResolvedValue({ id: "dlq-1" }),
    };
    mockWebhookNotifier = {
      notifyDlq: vi.fn().mockResolvedValue(undefined),
    };

    processor = new AuditLogRetentionProcessor(
      mockAuditLog as unknown as OrganizationsAuditLogService,
      mockRetentionQueue as unknown as Queue,
      mockDlqQueue as unknown as Queue,
      mockWebhookNotifier as unknown as WebhookNotifierService,
    );
  });

  it("returns zero counts when job is undefined", async () => {
    await expect(processor.process(undefined)).resolves.toEqual({
      scannedOrgs: 0,
      deletedCount: 0,
    });
    expect(mockAuditLog.purgeExpiredOrgLogs).not.toHaveBeenCalled();
  });

  it("purges expired org audit logs and operational hygiene records", async () => {
    const job = {
      id: "retention-1",
      name: AUDIT_LOG_RETENTION_SWEEP_JOB,
      data: { trigger: "scheduled" },
    } as unknown as Job;

    const result = await processor.process(job);

    expect(mockAuditLog.purgeExpiredOrgLogs).toHaveBeenCalledTimes(1);
    expect(mockAuditLog.purgeExpiredOperationalData).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      scannedOrgs: 2,
      deletedCount: 15,
      hygieneDeleted: {
        expiredSessions: 3,
        oldSecurityLogs: 5,
        oldNotifications: 7,
        processedOutboxEvents: 2,
      },
    });
  });

  it("routes terminal retention failures to DLQ and webhook notifier", async () => {
    await processor.onFailed(undefined, new Error("ignored"));
    expect(mockDlqQueue.add).not.toHaveBeenCalled();

    const failedJob = {
      id: "retention-fail-1",
      name: AUDIT_LOG_RETENTION_SWEEP_JOB,
      attemptsMade: 3,
      opts: { attempts: 3 },
      data: { trigger: "scheduled" },
    } as unknown as Job;

    await processor.onFailed(failedJob, new Error("DB timeout"));

    expect(mockDlqQueue.add).toHaveBeenCalledWith(
      "dead-letter-audit-retention",
      expect.objectContaining({
        originalJob: { trigger: "scheduled" },
        error: "DB timeout",
        totalAttempts: 3,
      }),
    );
    expect(mockWebhookNotifier.notifyDlq).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: AUDIT_LOG_RETENTION_DLQ,
        jobName: AUDIT_LOG_RETENTION_SWEEP_JOB,
        objectName: "retention-fail-1",
        reason: "audit-log-retention-terminal-failure",
        attemptsMade: 3,
      }),
    );
  });
});
