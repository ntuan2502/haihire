import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelegramProvider } from "./telegram.provider";
import type {
  WebhookMessage,
  WebhookProviderConfig,
} from "../webhook-provider.interface";

import { mockWebhookRequest } from "../../../test/helpers/mock-webhook-request";

vi.mock("node:https", () => ({ request: vi.fn() }));

describe("TelegramProvider", () => {
  const config: WebhookProviderConfig = {
    type: "TELEGRAM",
    url: "https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/sendMessage",
    chatId: "-1001234567890",
  };

  const sampleMessage: WebhookMessage = {
    eventId: "550e8400-e29b-41d4-a716-446655440000",
    eventType: "DLQ_ALERT",
    title: "🚨 HaiHire DLQ Alert",
    severity: "critical",
    fields: [
      { label: "Queue", value: "orphan-cleanup-dlq" },
      { label: "Object", value: "tenants/org-1/resumes/cv.pdf" },
      { label: "Reason", value: "transaction-rollback-failed" },
      { label: "Attempts", value: "5" },
    ],
    timestamp: "2026-10-07T10:00:00.000Z",
    footer: "HaiHire Enterprise ATS",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Case 1: formats message in HTML and POSTs to correct Telegram Bot URL with Event line", async () => {
    const { requestMock, end } = mockWebhookRequest(200);

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      new URL(config.url),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
      expect.any(Function),
    );

    const body = JSON.parse(end.mock.calls[0][0]);

    expect(body.chat_id).toBe("-1001234567890");
    expect(body.parse_mode).toBe("HTML");
    expect(body.disable_web_page_preview).toBe(true);
    expect(body.text).toContain("<b>🚨 HaiHire DLQ Alert</b>");
    expect(body.text).toContain("<b>Severity:</b> CRITICAL");
    expect(body.text).toContain("<b>Queue:</b> orphan-cleanup-dlq");
    expect(body.text).toContain("<i>HaiHire Enterprise ATS</i>");
    expect(body.text).toContain("Event: 550e8400...");
  });

  it("Case 2: correctly escapes HTML special characters (<, >, &) to prevent injection", async () => {
    const { end } = mockWebhookRequest(200);

    const injectionMessage: WebhookMessage = {
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "DLQ_ALERT",
      title: "Alert <script>alert(1)</script> & Warning",
      severity: "warning",
      fields: [{ label: "User <input>", value: "Tom & Jerry > Spike < Tyke" }],
      timestamp: "2026-10-07T10:00:00.000Z",
      footer: "Footer & <test>",
    };

    const provider = new TelegramProvider(config);
    await provider.send(injectionMessage);

    const sentBody = JSON.parse(end.mock.calls[0][0]);
    expect(sentBody.text).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; Warning",
    );
    expect(sentBody.text).toContain("User &lt;input&gt;");
    expect(sentBody.text).toContain("Tom &amp; Jerry &gt; Spike &lt; Tyke");
    expect(sentBody.text).toContain("Footer &amp; &lt;test&gt;");
    expect(sentBody.text).not.toContain("<script>");
  });

  it("Case 3: formats message without footer when footer is omitted", async () => {
    const { end } = mockWebhookRequest(200);

    const noFooterMessage: WebhookMessage = {
      eventId: "abcdef12-3456-7890-abcd-ef1234567890",
      eventType: "ORPHAN_SPIKE",
      title: "Alert",
      severity: "info",
      fields: [{ label: "Status", value: "OK" }],
      timestamp: "2026-10-07T10:00:00.000Z",
    };

    const provider = new TelegramProvider(config);
    await provider.send(noFooterMessage);

    const sentBody = JSON.parse(end.mock.calls[0][0]);
    expect(sentBody.text).not.toContain("<i>");
    expect(sentBody.text).toContain("Event: abcdef12...");
  });

  it("Case 4: returns failure with status and error message on HTTP 4xx error (e.g. 400 Bad Request)", async () => {
    const { destroy } = mockWebhookRequest(400);

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.errorMessage).toContain("Webhook returned HTTP 400");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("Case 4b: discards the response body on HTTP failure", async () => {
    const { destroy } = mockWebhookRequest(500);

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toBe("Webhook returned HTTP 500");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("Case 5: returns failure on HTTP 5xx server error (e.g. 502 Bad Gateway)", async () => {
    const { destroy } = mockWebhookRequest(502);

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(502);
    expect(result.errorMessage).toContain("Webhook returned HTTP 502");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("Case 6: returns failure with error message when the connection fails", async () => {
    mockWebhookRequest(new Error("Connection timeout to api.telegram.org"));

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Webhook connection failed");
  });

  it("Case 7: handles non-Error network exception gracefully", async () => {
    mockWebhookRequest("Fatal telegram stream closed");

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Webhook connection failed");
  });
});
