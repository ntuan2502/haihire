import { describe, expect, it, vi, beforeEach } from "vitest";
import { EmailService, interpolate, DEFAULT_TEMPLATES } from "./email.service";
import { EncryptionService } from "../common/encryption.service";

describe("EmailService", () => {
  let service: EmailService;
  let mockPrismaService: any;
  let mockActivitiesService: any;
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
    mockActivitiesService = {
      createActivity: vi.fn().mockResolvedValue({ id: "act-1" }),
    };

    const inMemoryTemplates: any[] = [];
    const inMemorySettings: any[] = [];
    const inMemoryLogs: any[] = [];

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
              where: vi.fn().mockImplementation((predicateFn) => ({
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
          },
        },
      },
    };

    service = new EmailService(mockPrismaService, mockActivitiesService, encryptionService);
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
      expect(templates.some((t: any) => t.type === "APPLICATION_CONFIRMATION")).toBe(true);
      expect(templates.some((t: any) => t.type === "INTERVIEW_INVITATION")).toBe(true);
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

      expect(result.status).toBe("SIMULATED");
      expect(result.recipientEmail).toBe("candidate@example.com");
      expect(result.subject).toBe("Thư mời phỏng vấn Product Manager");
      expect(result.body).toContain("Tran Van B");

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
      expect(updated.smtpPass).toBe("••••••••••••••••");
      expect(updated.resendApiKey).toBe("••••••••••••••••");

      // Internal dispatch settings should be decrypted
      const raw = await service.getRawSettings("org-test");
      expect(raw.smtpPass).toBe("SuperSecretPassword123");
      expect(raw.resendApiKey).toBe("re_secret_key_456");
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
      }) as any;

      expect(paged.total).toBe(3);
      expect(paged.page).toBe(1);
      expect(paged.limit).toBe(2);
      expect(paged.totalPages).toBe(2);
      expect(paged.data.length).toBe(2);
    });
  });
});
