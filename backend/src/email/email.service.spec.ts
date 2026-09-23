import { describe, expect, it, vi, beforeEach } from "vitest";
import { EmailService, interpolate, DEFAULT_TEMPLATES } from "./email.service";
import { EmailTransporterFactory } from "./transporters/transporter.factory";
import { EncryptionService } from "../common/encryption.service";
import { env } from "../config/env";

describe("EmailService", () => {
  let service: EmailService;
  let mockPrismaService: unknown;
  let mockActivitiesService: { createActivity: ReturnType<typeof vi.fn> };
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
    mockActivitiesService = {
      createActivity: vi.fn().mockResolvedValue({ id: "act-1" }),
    };

    const inMemoryTemplates: Array<Record<string, unknown>> = [];
    const inMemorySettings: Array<Record<string, unknown>> = [];
    const inMemoryLogs: Array<Record<string, unknown>> = [];

    mockPrismaService = {
      db: {
        orm: {
          public: {
            EmailTemplate: {
              where: vi.fn().mockImplementation((predicateFn) => ({
                where: vi.fn().mockImplementation((predicateFn2) => ({
                  first: vi.fn().mockImplementation(async () => {
                    return inMemoryTemplates.find((t) => {
                      const rec1 = { organizationId: { eq: (val: string) => t.organizationId === val } };
                      const rec2 = { type: { eq: (val: string) => t.type === val } };
                      return predicateFn(rec1) && predicateFn2(rec2);
                    }) || null;
                  }),
                })),
                all: vi.fn().mockImplementation(async () => {
                  return inMemoryTemplates.filter((t) => {
                    const rec = { organizationId: { eq: (val: string) => t.organizationId === val } };
                    return predicateFn(rec);
                  });
                }),
                first: vi.fn().mockImplementation(async () => {
                  return inMemoryTemplates.find((t) => {
                    const rec = { organizationId: { eq: (val: string) => t.organizationId === val } };
                    return predicateFn(rec);
                  }) || null;
                }),
                update: vi.fn().mockImplementation(async (data) => {
                  if (inMemoryTemplates[0]) {
                    Object.assign(inMemoryTemplates[0], data);
                  }
                  return inMemoryTemplates[0];
                }),
              })),
              create: vi.fn().mockImplementation(async (data) => {
                inMemoryTemplates.push(data);
                return data;
              }),
            },
            EmailSetting: {
              where: vi.fn().mockImplementation((predicateFn) => ({
                first: vi.fn().mockImplementation(async () => {
                  return inMemorySettings.find((s) => {
                    const rec = { organizationId: { eq: (val: string) => s.organizationId === val } };
                    return predicateFn(rec);
                  }) || null;
                }),
                update: vi.fn().mockImplementation(async (data) => {
                  if (inMemorySettings[0]) {
                    Object.assign(inMemorySettings[0], data);
                  }
                  return inMemorySettings[0];
                }),
              })),
              create: vi.fn().mockImplementation(async (data) => {
                inMemorySettings.push(data);
                return data;
              }),
            },
            EmailLog: {
              where: vi.fn().mockImplementation((_predicateFn) => ({
                where: vi.fn().mockImplementation(() => ({
                  all: vi.fn().mockResolvedValue(inMemoryLogs),
                })),
                all: vi.fn().mockResolvedValue(inMemoryLogs),
              })),
              create: vi.fn().mockImplementation(async (data) => {
                inMemoryLogs.push(data);
                return data;
              }),
            },
            Organization: {
              select: vi.fn().mockImplementation(() => ({
                first: vi.fn().mockResolvedValue({ id: "org-1" }),
              })),
            },
          },
        },
      },
    };

    service = new EmailService(
      mockPrismaService as never,
      mockActivitiesService as never,
      encryptionService,
    );
  });

  describe("Variable Interpolation", () => {
    it("should interpolate template variables correctly", () => {
      const template = "Xin chào {{candidate_name}}, bạn ứng tuyển {{job_title}} tại {{company_name}}.";
      const vars = {
        candidate_name: "Nguyễn Văn A",
        job_title: "Kỹ sư phần mềm",
        company_name: "Tech Corp",
      };
      const result = interpolate(template, vars);
      expect(result).toBe("Xin chào Nguyễn Văn A, bạn ứng tuyển Kỹ sư phần mềm tại Tech Corp.");
    });

    it("should preserve unmapped variables gracefully", () => {
      const template = "Hello {{candidate_name}}, your code is {{unknown_var}}.";
      const vars = { candidate_name: "Alice" };
      const result = interpolate(template, vars);
      expect(result).toBe("Hello Alice, your code is {{unknown_var}}.");
    });
  });

  describe("Template Seeding and Retrieval", () => {
    it("should seed default templates if none exist for organization", async () => {
      const templates = await service.getTemplates("org-test");
      expect(templates.length).toBe(DEFAULT_TEMPLATES.length);
      expect(templates.some((t) => t.type === "APPLICATION_CONFIRMATION")).toBe(true);
      expect(templates.some((t) => t.type === "INTERVIEW_INVITATION")).toBe(true);
    });
  });

  describe("Send Email and Activity Logging", () => {
    it("should create email log and trigger candidate activity", async () => {
      const result = await service.sendEmail(
        {
          to: "candidate@example.com",
          recipientName: "Tran Van B",
          subject: "Thư mời phỏng vấn {{job_title}}",
          body: "<p>Kính mời bạn {{candidate_name}} tham gia phỏng vấn</p>",
          templateType: "INTERVIEW_INVITATION",
          candidateId: "cand-123",
          applicationId: "app-456",
          variables: {
            candidate_name: "Tran Van B",
            job_title: "Product Manager",
          },
        },
        "org-test",
        { id: "user-1", name: "Recruiter Alice" },
      );

      const sentLog = result as {
        status: string;
        recipientEmail: string;
        subject: string;
        body: string;
      };

      expect(sentLog.status).toBe("SIMULATED");
      expect(sentLog.recipientEmail).toBe("candidate@example.com");
      expect(sentLog.subject).toBe("Thư mời phỏng vấn Product Manager");
      expect(sentLog.body).toContain("Tran Van B");

      // Verify activity logged
      expect(mockActivitiesService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-test",
          candidateId: "cand-123",
          type: "EMAIL_SENT",
        }),
      );
    });
  });

  describe("Credentials Encryption and Masking", () => {
    it("should encrypt credentials when saving settings and return masked values", async () => {
      const updated = await service.updateSettings("org-test", {
        smtpHost: "smtp.example.com",
        smtpUser: "test@example.com",
        smtpPass: "SuperSecretPassword123",
        resendApiKey: "re_secret_key_456",
      });

      // Public view returned to client must be masked
      expect(updated?.smtpPass).toBe("••••••••••••••••");
      expect(updated?.resendApiKey).toBe("••••••••••••••••");

      // Internal dispatch settings should be decrypted
      const raw = await service.getRawSettings("org-test");
      expect(raw?.smtpPass).toBe("SuperSecretPassword123");
      expect(raw?.resendApiKey).toBe("re_secret_key_456");
    });
  });

  describe("Outbox Logs Pagination and Filtering", () => {
    it("should paginate logs correctly", async () => {
      // Create 3 logs
      for (let i = 1; i <= 3; i++) {
        await service.sendEmail(
          {
            to: `candidate${i}@example.com`,
            recipientName: `Candidate ${i}`,
            subject: `Subject ${i}`,
            body: `Body ${i}`,
          },
          "org-test",
        );
      }

      const paged = await service.getLogs("org-test", {
        page: 1,
        limit: 2,
      });

      expect(paged.total).toBe(3);
      expect(paged.page).toBe(1);
      expect(paged.limit).toBe(2);
      expect(paged.totalPages).toBe(2);
      expect(paged.data.length).toBe(2);
    });
  });

  describe("BullMQ Queue and EmailProcessor", () => {
    it("should enqueue email when emailQueue is provided", async () => {
      const mockQueue = {
        add: vi.fn().mockResolvedValue({ id: "job-123" }),
      };

      const queuedService = new EmailService(
        mockPrismaService as never,
        mockActivitiesService as never,
        encryptionService,
        mockQueue as never,
      );

      const result = await queuedService.sendEmail(
        {
          to: "queued@example.com",
          recipientName: "Queued Recipient",
          subject: "Asynchronous notification",
          body: "Hello async",
        },
        "org-test",
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        "send-email",
        expect.objectContaining({
          organizationId: "org-test",
        }),
        expect.objectContaining({
          attempts: 3,
        }),
      );
      expect(result).toEqual({
        id: "job-123",
        status: "QUEUED",
        message: "Email queued for delivery",
      });
    });
  });

  describe("System Email", () => {
    it("should retrieve masked system email configuration from env", () => {
      const config = service.getSystemEmailConfig();
      expect(config).toBeDefined();
      expect(config.provider).toBe(env.SYSTEM_EMAIL_PROVIDER);
      expect(config.fromName).toBe(env.SYSTEM_EMAIL_FROM_NAME || "HaiHire Platform");
      expect(config.fromEmail).toBe(env.SYSTEM_EMAIL_FROM_EMAIL || "noreply@haihire.internal");
    });

    it("should send system email with simulated provider", async () => {
      const result = await service.sendSystemEmail({
        to: "user@example.com",
        recipientName: "New User",
        subject: "Welcome to HaiHire",
        body: "Hello and welcome to {{platform}}",
        variables: { platform: "HaiHire Platform" },
        organizationId: "org-1",
      });

      if (!("success" in result)) {
        throw new Error("Expected direct send result");
      }
      expect(result.success).toBe(true);
      expect(result.status).toBe(env.SYSTEM_EMAIL_PROVIDER === "SIMULATED" ? "SIMULATED" : "SENT");
      expect(result.to).toBe("user@example.com");
      expect(result.from).toContain("HaiHire Platform");
      expect(result.subject).toBe("Welcome to HaiHire");
    }, 15000);

    it("should send system test email", async () => {
      const result = await service.sendSystemTestEmail({
        to: "admin@example.com",
      });

      if (!("success" in result)) {
        throw new Error("Expected direct send result");
      }
      expect(result.success).toBe(true);
      expect(result.status).toBe(env.SYSTEM_EMAIL_PROVIDER === "SIMULATED" ? "SIMULATED" : "SENT");
      expect(result.to).toBe("admin@example.com");
      expect(result.subject).toContain("[System Test]");
    }, 15000);

    it("should retrieve system logs with pagination", async () => {
      const logs = await service.getSystemLogs();
      expect(logs).toBeDefined();
      expect(logs.data).toBeInstanceOf(Array);
      expect(logs.page).toBe(1);
      expect(logs.limit).toBe(20);
    });
  });

  describe("EmailTransporterFactory", () => {
    it("should instantiate SimulatedTransporter for SIMULATED provider", () => {
      const transporter = EmailTransporterFactory.create({
        provider: "SIMULATED",
        fromName: "Test",
        fromEmail: "test@example.com",
      });
      expect(transporter).toBeDefined();
    });

    it("should instantiate SmtpTransporter for SMTP provider", () => {
      const transporter = EmailTransporterFactory.create({
        provider: "SMTP",
        fromName: "Test",
        fromEmail: "test@example.com",
        smtpHost: "smtp.example.com",
        smtpPort: 587,
        smtpUser: "user",
        smtpPass: "pass",
      });
      expect(transporter).toBeDefined();
    });

    it("should instantiate ResendTransporter for RESEND provider", () => {
      const transporter = EmailTransporterFactory.create({
        provider: "RESEND",
        fromName: "Test",
        fromEmail: "test@example.com",
        resendApiKey: "re_12345678",
      });
      expect(transporter).toBeDefined();
    });

    it("should instantiate SendGridTransporter for SENDGRID provider", () => {
      const transporter = EmailTransporterFactory.create({
        provider: "SENDGRID",
        fromName: "Test",
        fromEmail: "test@example.com",
        sendgridApiKey: "SG.12345678",
      });
      expect(transporter).toBeDefined();
    });
  });
});

