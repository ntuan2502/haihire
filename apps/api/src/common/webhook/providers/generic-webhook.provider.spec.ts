import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { GenericWebhookProvider } from "./generic-webhook.provider";
import type {
  WebhookMessage,
  WebhookProviderConfig,
} from "../webhook-provider.interface";

import { mockWebhookRequest } from "../../../test/helpers/mock-webhook-request";

vi.mock("node:https", () => ({ request: vi.fn() }));

describe("GenericWebhookProvider", () => {
  const baseUrl = "https://hooks.example.com/receiver";

  const sampleMessage: WebhookMessage = {
    eventId: "550e8400-e29b-41d4-a716-446655440000",
    eventType: "DLQ_ALERT",
    title: "🚨 HaiHire DLQ Alert",
    severity: "critical",
    fields: [
      { label: "Queue", value: "orphan-cleanup-dlq" },
      { label: "Object", value: "tenants/org-1/resumes/permanent.pdf" },
    ],
    timestamp: "2026-10-07T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Case 1: sends raw JSON payload with application/json header, eventId, eventType and source 'haihire-ats'", async () => {
    const { requestMock, end } = mockWebhookRequest(200);

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(requestMock).toHaveBeenCalledTimes(1);

    const callArgs = requestMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toEqual(new URL(baseUrl));
    expect(options?.method).toBe("POST");
    expect((options?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(
      (options?.headers as Record<string, string>)["X-HaiHire-Signature"],
    ).toBeUndefined();

    const body = JSON.parse(end.mock.calls[0][0]);
    expect(body.eventId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(body.eventType).toBe("DLQ_ALERT");
    expect(body.title).toBe(sampleMessage.title);
    expect(body.severity).toBe(sampleMessage.severity);
    expect(body.fields).toEqual(sampleMessage.fields);
    expect(body.source).toBe("haihire-ats");
  });

  it("Case 2: computes valid HMAC-SHA256 signature when secretToken is configured", async () => {
    const secret = "super-secret-signing-key-12345";
    const { requestMock, end } = mockWebhookRequest(200);

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
      secretToken: secret,
    };

    const provider = new GenericWebhookProvider(config);
    await provider.send(sampleMessage);

    const callArgs = requestMock.mock.calls[0];
    const rawBody = end.mock.calls[0][0];
    const sentSignature = (callArgs[1]?.headers as Record<string, string>)[
      "X-HaiHire-Signature"
    ];

    expect(sentSignature).toBeDefined();
    expect(sentSignature).toMatch(/^sha256=[a-f0-9]{64}$/);

    // Verify HMAC
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    expect(sentSignature).toBe(`sha256=${expectedHmac}`);
  });

  it("Case 3: returns failure on HTTP 4xx/5xx response from receiving webhook endpoint", async () => {
    const { destroy } = mockWebhookRequest(500);

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toContain("Webhook returned HTTP 500");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("Case 3b: discards the response body on HTTP failure", async () => {
    const { destroy } = mockWebhookRequest(502);

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(502);
    expect(result.errorMessage).toBe("Webhook returned HTTP 502");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("Case 4: returns failure with error message when the connection fails", async () => {
    mockWebhookRequest(new Error("ECONNREFUSED 127.0.0.1:8080"));

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Webhook connection failed");
  });

  it("Case 5: handles non-Error network exception gracefully", async () => {
    mockWebhookRequest("Fatal network crash");

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Webhook connection failed");
  });
});
