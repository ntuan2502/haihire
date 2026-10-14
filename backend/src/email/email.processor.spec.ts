import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Job, Queue } from "bullmq";
import {
  EmailProcessor,
  EMAIL_QUEUE_NAME,
  EMAIL_DLQ_NAME,
  type SendEmailJobData,
  type SendSystemEmailJobData,
} from "./email.processor";
import type { EmailService } from "./email.service";
import type { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";

describe("EmailProcessor", () => {
  let processor: EmailProcessor;
  let mockEmailService: {
    executeSendEmail: ReturnType<typeof vi.fn>;
    executeSendSystemEmail: ReturnType<typeof vi.fn>;
  };
  let mockDlqQueue: {
    add: ReturnType<typeof vi.fn>;
  };
  let mockWebhookNotifier: {
    notifyDlq: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockEmailService = {
      executeSendEmail: vi.fn().mockResolvedValue({ id: "log-1", status: "SENT" }),
      executeSendSystemEmail: vi.fn().mockResolvedValue({ success: true, status: "SENT" }),
    };

    mockDlqQueue = {
      add: vi.fn().mockResolvedValue({ id: "dlq-1" }),
    };

    mockWebhookNotifier = {
      notifyDlq: vi.fn().mockResolvedValue(undefined),
    };

    processor = new EmailProcessor(
      mockEmailService as unknown as EmailService,
      mockDlqQueue as unknown as Queue,
      mockWebhookNotifier as unknown as WebhookNotifierService,
    );
  });

  describe("Queue Configuration Constants", () => {
    it("should export correct queue and DLQ constant names", () => {
      expect(EMAIL_QUEUE_NAME).toBe("email-queue");
      expect(EMAIL_DLQ_NAME).toBe("email-dlq-queue");
    });
  });

  describe("process", () => {
    it("processes regular send-email job via EmailService.executeSendEmail", async () => {
      const job = {
        id: "job-send-email-1",
        name: "send-email",
        data: {
          dto: {
            to: "candidate@example.com",
            subject: "Interview Invitation",
            body: "<p>Hello</p>",
            templateType: "INTERVIEW_INVITATION",
          },
          organizationId: "org-1",
          senderUser: { id: "user-1", name: "Recruiter Bob" },
        },
      } as unknown as Job<SendEmailJobData>;

      const result = await processor.process(job);

      expect(mockEmailService.executeSendEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.executeSendEmail).toHaveBeenCalledWith(
        job.data.dto,
        "org-1",
        { id: "user-1", name: "Recruiter Bob" },
      );
      expect(result).toEqual({ id: "log-1", status: "SENT" });
    });

    it("processes send-system-email job via EmailService.executeSendSystemEmail", async () => {
      const job = {
        id: "job-sys-email-1",
        name: "send-system-email",
        data: {
          dto: {
            to: "admin@haihire.local",
            subject: "System Alert",
            body: "<p>Disk space normal</p>",
          },
        },
      } as unknown as Job<SendSystemEmailJobData>;

      const result = await processor.process(job);

      expect(mockEmailService.executeSendSystemEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.executeSendSystemEmail).toHaveBeenCalledWith(job.data.dto);
      expect(result).toEqual({ success: true, status: "SENT" });
    });

    it("rethrows error when execution fails so BullMQ marks attempt as failed", async () => {
      mockEmailService.executeSendEmail.mockRejectedValueOnce(
        new Error("SMTP Connection refused"),
      );

      const job = {
        id: "job-fail-1",
        name: "send-email",
        data: {
          dto: {
            to: "candidate@example.com",
            subject: "Interview",
            body: "<p>Hello</p>",
          },
          organizationId: "org-1",
        },
      } as unknown as Job<SendEmailJobData>;

      await expect(processor.process(job)).rejects.toThrow("SMTP Connection refused");
    });
  });

  describe("onFailed (DLQ Alerting)", () => {
    it("does NOT route to DLQ or trigger webhook on intermediate retry failure (attemptsMade < 3)", async () => {
      const retryJob = {
        id: "job-retry-1",
        name: "send-email",
        data: {
          dto: {
            to: "candidate@example.com",
            subject: "Interview Invitation",
            body: "<p>Hello</p>",
          },
          organizationId: "org-1",
        },
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Job<SendEmailJobData>;

      await processor.onFailed(retryJob, new Error("Transient network glitch"));

      expect(mockDlqQueue.add).not.toHaveBeenCalled();
      expect(mockWebhookNotifier.notifyDlq).not.toHaveBeenCalled();
    });

    it("routes to email-dlq-queue and fires WebhookNotifier on terminal failure (attemptsMade >= 3)", async () => {
      const terminalJob = {
        id: "job-term-1",
        name: "send-email",
        data: {
          dto: {
            to: "candidate@example.com",
            subject: "Interview Invitation",
            body: "<p>Hello</p>",
          },
          organizationId: "org-1",
          emailId: "email-record-999",
        },
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job<SendEmailJobData>;

      const error = new Error("550 5.1.1 User unknown");

      await processor.onFailed(terminalJob, error);

      // Verify dead-letter queue forwarding
      expect(mockDlqQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDlqQueue.add).toHaveBeenCalledWith("dead-letter-email", {
        originalJob: terminalJob.data,
        failedAt: expect.any(String),
        error: "550 5.1.1 User unknown",
        totalAttempts: 3,
      });

      // Verify webhook alert dispatch with complete diagnostic context
      expect(mockWebhookNotifier.notifyDlq).toHaveBeenCalledTimes(1);
      expect(mockWebhookNotifier.notifyDlq).toHaveBeenCalledWith(
        {
          queue: "email-dlq-queue",
          jobName: "send-email",
          objectName: "email-record-999",
          reason: "email-queue-terminal-failure",
          attemptsMade: 3,
          errorMessage: "550 5.1.1 User unknown",
          timestamp: expect.any(String),
        },
        "org-1",
      );
    });

    it("falls back to recipient address when emailId is not present", async () => {
      const terminalJob = {
        id: "job-term-2",
        name: "send-email",
        data: {
          dto: {
            to: "fallback-candidate@example.com",
            subject: "Offer Letter",
            body: "<p>Welcome</p>",
          },
          organizationId: "org-2",
        },
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job<SendEmailJobData>;

      await processor.onFailed(terminalJob, new Error("SMTP Authentication Failed"));

      expect(mockWebhookNotifier.notifyDlq).toHaveBeenCalledWith(
        expect.objectContaining({
          objectName: "fallback-candidate@example.com",
          queue: "email-dlq-queue",
        }),
        "org-2",
      );
    });

    it("gracefully catches exceptions from DLQ queue or webhook notifier without crashing", async () => {
      mockDlqQueue.add.mockRejectedValueOnce(new Error("Redis Out of Memory"));
      mockWebhookNotifier.notifyDlq.mockRejectedValueOnce(new Error("Webhook DNS failure"));

      const terminalJob = {
        id: "job-resilient-1",
        name: "send-system-email",
        data: {
          dto: {
            to: "sysadmin@haihire.local",
            subject: "Critical System Notice",
            body: "<p>Notice</p>",
          },
        },
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job<SendSystemEmailJobData>;

      // Should not throw
      await expect(
        processor.onFailed(terminalJob, new Error("Mail provider unreachable")),
      ).resolves.toBeUndefined();
    });

    it("operates safely when optional dlqQueue or webhookNotifier are not injected", async () => {
      const isolatedProcessor = new EmailProcessor(
        mockEmailService as unknown as EmailService,
        undefined,
        undefined,
      );

      const terminalJob = {
        id: "job-isolated-1",
        name: "send-email",
        data: {
          dto: {
            to: "no-dlq@example.com",
            subject: "Isolated Test",
            body: "<p>Isolated</p>",
          },
          organizationId: "org-iso",
        },
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job<SendEmailJobData>;

      await expect(
        isolatedProcessor.onFailed(terminalJob, new Error("Fatal send failure")),
      ).resolves.toBeUndefined();
    });
  });
});
