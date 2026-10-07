import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebhookNotifierService, type DlqAlertPayload } from "./webhook-notifier.service";
import { WebhookProviderFactory } from "./webhook-provider.factory";
import { Logger } from "@nestjs/common";
import type { WebhookProvider } from "./webhook-provider.interface";

describe("WebhookNotifierService", () => {
  let service: WebhookNotifierService;

  const sampleDlqPayload: DlqAlertPayload = {
    queue: "orphan-cleanup-dlq",
    jobName: "dead-letter-cleanup",
    objectName: "tenants/org-1/resumes/permanent-orphan.pdf",
    reason: "transaction-rollback-compensation-failed",
    attemptsMade: 5,
    errorMessage: "MinIO Connection Refused (503 Service Unavailable)",
    timestamp: "2026-10-07T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookNotifierService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Case 1: when globalConfig is null (no env configured), logs warning and does not crash", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: null,
      writable: true,
      configurable: true,
    });

    const warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    const factorySpy = vi.spyOn(WebhookProviderFactory, "create");

    await expect(service.notifyDlq(sampleDlqPayload)).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No webhook config available, skipping alert"),
    );
    expect(factorySpy).not.toHaveBeenCalled();
  });

  it("Case 2: when globalConfig is valid, creates provider and dispatches alert message", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: {
        type: "DISCORD",
        url: "https://discord.com/api/webhooks/123/abc",
      },
      writable: true,
      configurable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockResolvedValue({ success: true, statusCode: 204 }),
    };
    vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);

    await service.notifyDlq(sampleDlqPayload);

    expect(WebhookProviderFactory.create).toHaveBeenCalledWith({
      type: "DISCORD",
      url: "https://discord.com/api/webhooks/123/abc",
    });
    expect(mockProvider.send).toHaveBeenCalledTimes(1);

    const sentMessage = (mockProvider.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(sentMessage.title).toBe("🚨 HaiHire DLQ Alert");
    expect(sentMessage.severity).toBe("critical");
    expect(sentMessage.fields).toHaveLength(6);
    expect(sentMessage.fields).toEqual(
      expect.arrayContaining([
        { label: "Queue", value: "orphan-cleanup-dlq" },
        { label: "Job", value: "dead-letter-cleanup" },
        { label: "Object", value: "tenants/org-1/resumes/permanent-orphan.pdf" },
        { label: "Reason", value: "transaction-rollback-compensation-failed" },
        { label: "Attempts", value: "5" },
        { label: "Error", value: "MinIO Connection Refused (503 Service Unavailable)" },
      ]),
    );
  });

  it("Case 3: logs error when provider.send returns failure result", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: {
        type: "TELEGRAM",
        url: "https://api.telegram.org/bot123/sendMessage",
        chatId: "123",
      },
      writable: true,
      configurable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockResolvedValue({
        success: false,
        statusCode: 400,
        errorMessage: "Chat not found",
      }),
    };
    vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);
    const errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    await expect(service.notifyDlq(sampleDlqPayload)).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Webhook send failed: Chat not found"),
    );
  });

  it("Case 4: is non-throwing when provider.send throws an unexpected runtime exception", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: {
        type: "GENERIC",
        url: "https://hooks.example.com",
      },
      writable: true,
      configurable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockRejectedValue(new Error("Fatal TLS certificate validation crash")),
    };
    vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);
    const errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    await expect(service.notifyDlq(sampleDlqPayload)).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Webhook notify failed: Fatal TLS certificate validation crash"),
    );
  });

  it("Case 5: buildDlqMessage sets severity to 'warning' when attemptsMade < 5", () => {
    const warningPayload = { ...sampleDlqPayload, attemptsMade: 3 };
    const message = service.buildDlqMessage(warningPayload);
    expect(message.severity).toBe("warning");
  });

  it("Case 6: buildDlqMessage sets severity to 'critical' when attemptsMade >= 5", () => {
    const criticalPayload = { ...sampleDlqPayload, attemptsMade: 5 };
    const message = service.buildDlqMessage(criticalPayload);
    expect(message.severity).toBe("critical");
  });

  it("Case 7: buildDlqMessage truncates error message longer than 500 characters", () => {
    const longError = "Z".repeat(800);
    const longPayload = { ...sampleDlqPayload, errorMessage: longError };
    const message = service.buildDlqMessage(longPayload);

    const errorField = message.fields.find((f) => f.label === "Error");
    expect(errorField?.value.length).toBe(500);
    expect(errorField?.value).toBe("Z".repeat(500));
  });
});
