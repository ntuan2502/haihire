import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { GenericWebhookProvider } from "./generic-webhook.provider";
import type { WebhookMessage, WebhookProviderConfig } from "../webhook-provider.interface";

describe("GenericWebhookProvider", () => {
  const originalFetch = globalThis.fetch;
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

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("Case 1: sends raw JSON payload with application/json header, eventId, eventType and source 'haihire-ats'", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    globalThis.fetch = mockFetch;

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe(baseUrl);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-HaiHire-Signature"]).toBeUndefined();

    const body = JSON.parse(options.body as string);
    expect(body.eventId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(body.eventType).toBe("DLQ_ALERT");
    expect(body.title).toBe(sampleMessage.title);
    expect(body.severity).toBe(sampleMessage.severity);
    expect(body.fields).toEqual(sampleMessage.fields);
    expect(body.source).toBe("haihire-ats");
  });

  it("Case 2: computes valid HMAC-SHA256 signature when secretToken is configured", async () => {
    const secret = "super-secret-signing-key-12345";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    globalThis.fetch = mockFetch;

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
      secretToken: secret,
    };

    const provider = new GenericWebhookProvider(config);
    await provider.send(sampleMessage);

    const callArgs = mockFetch.mock.calls[0];
    const rawBody = callArgs[1].body as string;
    const sentSignature = callArgs[1].headers["X-HaiHire-Signature"];

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
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("Internal Server Error in receiver"),
    } as unknown as Response);

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toContain("Generic webhook returned HTTP 500");
    expect(result.errorMessage).toContain("Internal Server Error in receiver");
  });

  it("Case 3b: handles HTTP failure when response.text() throws gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: vi.fn().mockRejectedValue(new Error("Cannot read body stream")),
    } as unknown as Response);

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(502);
    expect(result.errorMessage).toBe("Generic webhook returned HTTP 502");
  });

  it("Case 4: returns failure with error message when fetch encounters network timeout", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:8080"));

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("Generic webhook network error: ECONNREFUSED");
  });

  it("Case 5: handles non-Error network exception gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue("Fatal network crash");

    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: baseUrl,
    };

    const provider = new GenericWebhookProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Generic webhook network error: Fatal network crash");
  });
});
