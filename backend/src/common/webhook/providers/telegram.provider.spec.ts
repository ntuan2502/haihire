import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TelegramProvider } from "./telegram.provider";
import type { WebhookMessage, WebhookProviderConfig } from "../webhook-provider.interface";

describe("TelegramProvider", () => {
  const originalFetch = globalThis.fetch;
  const config: WebhookProviderConfig = {
    type: "TELEGRAM",
    url: "https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/sendMessage",
    chatId: "-1001234567890",
  };

  const sampleMessage: WebhookMessage = {
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

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("Case 1: formats message in HTML and POSTs to correct Telegram Bot URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    globalThis.fetch = mockFetch;

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      config.url,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string);

    expect(body.chat_id).toBe("-1001234567890");
    expect(body.parse_mode).toBe("HTML");
    expect(body.disable_web_page_preview).toBe(true);
    expect(body.text).toContain("<b>🚨 HaiHire DLQ Alert</b>");
    expect(body.text).toContain("<b>Severity:</b> CRITICAL");
    expect(body.text).toContain("<b>Queue:</b> orphan-cleanup-dlq");
    expect(body.text).toContain("<i>HaiHire Enterprise ATS</i>");
  });

  it("Case 2: correctly escapes HTML special characters (<, >, &) to prevent injection", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    globalThis.fetch = mockFetch;

    const injectionMessage: WebhookMessage = {
      title: "Alert <script>alert(1)</script> & Warning",
      severity: "warning",
      fields: [
        { label: "User <input>", value: "Tom & Jerry > Spike < Tyke" },
      ],
      timestamp: "2026-10-07T10:00:00.000Z",
      footer: "Footer & <test>",
    };

    const provider = new TelegramProvider(config);
    await provider.send(injectionMessage);

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(sentBody.text).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; Warning");
    expect(sentBody.text).toContain("User &lt;input&gt;");
    expect(sentBody.text).toContain("Tom &amp; Jerry &gt; Spike &lt; Tyke");
    expect(sentBody.text).toContain("Footer &amp; &lt;test&gt;");
    expect(sentBody.text).not.toContain("<script>");
  });

  it("Case 3: formats message without footer when footer is omitted", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    globalThis.fetch = mockFetch;

    const noFooterMessage: WebhookMessage = {
      title: "Alert",
      severity: "info",
      fields: [{ label: "Status", value: "OK" }],
      timestamp: "2026-10-07T10:00:00.000Z",
    };

    const provider = new TelegramProvider(config);
    await provider.send(noFooterMessage);

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(sentBody.text).not.toContain("<i>");
  });

  it("Case 4: returns failure with status and error message on HTTP 4xx error (e.g. 400 Bad Request)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('{"ok":false,"description":"Bad Request: chat not found"}'),
    } as unknown as Response);

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.errorMessage).toContain("Telegram API returned HTTP 400");
    expect(result.errorMessage).toContain("chat not found");
  });

  it("Case 5: returns failure on HTTP 5xx server error (e.g. 502 Bad Gateway)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: vi.fn().mockResolvedValue("Bad Gateway"),
    } as unknown as Response);

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(502);
    expect(result.errorMessage).toContain("Telegram API returned HTTP 502");
  });

  it("Case 6: returns failure with error message when fetch throws a network exception", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Connection timeout to api.telegram.org"));

    const provider = new TelegramProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("Telegram network error: Connection timeout");
  });
});
