import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DiscordProvider } from "./discord.provider";
import type { WebhookMessage, WebhookProviderConfig } from "../webhook-provider.interface";

describe("DiscordProvider", () => {
  const originalFetch = globalThis.fetch;
  const config: WebhookProviderConfig = {
    type: "DISCORD",
    url: "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz",
  };

  const sampleMessage: WebhookMessage = {
    title: "🚨 HaiHire DLQ Alert",
    severity: "critical",
    fields: [
      { label: "Queue", value: "orphan-cleanup-dlq" },
      { label: "Job", value: "dead-letter-cleanup" },
      { label: "Object", value: "tenants/org-1/resumes/permanent.pdf" },
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

  it("Case 1: formats Discord embed with red color for critical severity and posts JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    } as Response);
    globalThis.fetch = mockFetch;

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(204);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string);

    expect(body.embeds).toHaveLength(1);
    const embed = body.embeds[0];
    expect(embed.title).toBe("🚨 HaiHire DLQ Alert");
    expect(embed.color).toBe(0xe74c3c); // Red for critical
    expect(embed.fields).toHaveLength(3);
    expect(embed.fields[0]).toEqual({ name: "Queue", value: "orphan-cleanup-dlq", inline: false });
    expect(embed.footer).toEqual({ text: "HaiHire Enterprise ATS" });
    expect(embed.timestamp).toBe("2026-10-07T10:00:00.000Z");
  });

  it("Case 2: sets warning color (0xF39C12) and info color (0x3498DB) based on severity", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    globalThis.fetch = mockFetch;

    const provider = new DiscordProvider(config);

    // Warning
    await provider.send({ ...sampleMessage, severity: "warning" });
    let body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.embeds[0].color).toBe(0xf39c12);

    // Info
    await provider.send({ ...sampleMessage, severity: "info" });
    body = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    expect(body.embeds[0].color).toBe(0x3498db);
  });

  it("Case 3: applies default footer when footer is omitted", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    globalThis.fetch = mockFetch;

    const provider = new DiscordProvider(config);
    const msgWithoutFooter: WebhookMessage = {
      title: "Alert",
      severity: "info",
      fields: [],
      timestamp: "2026-10-07T10:00:00.000Z",
    };

    await provider.send(msgWithoutFooter);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.embeds[0].footer.text).toBe("HaiHire Enterprise ATS");
  });

  it("Case 4: returns failure with status code when Discord API responds with error (e.g. 404 / 400)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('{"message": "Unknown Webhook"}'),
    } as unknown as Response);

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.errorMessage).toContain("Discord webhook returned HTTP 404");
  });

  it("Case 5: returns failure with error message when fetch throws a network exception", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Discord connection reset by peer"));

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("Discord network error: Discord connection reset");
  });
});
