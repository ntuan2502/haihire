import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscordProvider } from "./discord.provider";
import type {
  WebhookMessage,
  WebhookProviderConfig,
} from "../webhook-provider.interface";

import { mockWebhookRequest } from "../../../test/helpers/mock-webhook-request";

vi.mock("node:https", () => ({ request: vi.fn() }));

describe("DiscordProvider", () => {
  const config: WebhookProviderConfig = {
    type: "DISCORD",
    url: "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz",
  };

  const sampleMessage: WebhookMessage = {
    eventId: "550e8400-e29b-41d4-a716-446655440000",
    eventType: "DLQ_ALERT",
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

  it("Case 1: formats Discord embed with red color for critical severity and posts JSON with eventId in footer", async () => {
    const { requestMock, end } = mockWebhookRequest(204);

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(204);
    expect(requestMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(end.mock.calls[0][0]);

    expect(body.embeds).toHaveLength(1);
    const embed = body.embeds[0];
    expect(embed.title).toBe("🚨 HaiHire DLQ Alert");
    expect(embed.color).toBe(0xe74c3c); // Red for critical
    expect(embed.fields).toHaveLength(3);
    expect(embed.fields[0]).toEqual({
      name: "Queue",
      value: "orphan-cleanup-dlq",
      inline: false,
    });
    expect(embed.footer).toEqual({
      text: "HaiHire Enterprise ATS • Event: 550e8400...",
    });
    expect(embed.timestamp).toBe("2026-10-07T10:00:00.000Z");
  });

  it("Case 2: sets warning color (0xF39C12) and info color (0x3498DB) based on severity", async () => {
    const { end } = mockWebhookRequest(204);

    const provider = new DiscordProvider(config);

    // Warning
    await provider.send({ ...sampleMessage, severity: "warning" });
    let body = JSON.parse(end.mock.calls[0][0]);
    expect(body.embeds[0].color).toBe(0xf39c12);

    // Info
    await provider.send({ ...sampleMessage, severity: "info" });
    body = JSON.parse(end.mock.calls[1][0]);
    expect(body.embeds[0].color).toBe(0x3498db);
  });

  it("Case 3: applies default footer with eventId when footer is omitted", async () => {
    const { end } = mockWebhookRequest(204);

    const provider = new DiscordProvider(config);
    const msgWithoutFooter: WebhookMessage = {
      eventId: "abcdef12-3456-7890-abcd-ef1234567890",
      eventType: "ORPHAN_SPIKE",
      title: "Alert",
      severity: "info",
      fields: [],
      timestamp: "2026-10-07T10:00:00.000Z",
    };

    await provider.send(msgWithoutFooter);
    const body = JSON.parse(end.mock.calls[0][0]);
    expect(body.embeds[0].footer.text).toBe(
      "HaiHire Enterprise ATS • Event: abcdef12...",
    );
  });

  it("Case 4: returns failure with status code when Discord API responds with error (e.g. 404 / 400)", async () => {
    const { destroy } = mockWebhookRequest(404);

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.errorMessage).toContain("Webhook returned HTTP 404");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("Case 4b: discards the response body on HTTP failure", async () => {
    const { destroy } = mockWebhookRequest(500);

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toBe("Webhook returned HTTP 500");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("Case 5: returns failure with error message when the connection fails", async () => {
    mockWebhookRequest(new Error("Discord connection reset by peer"));

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Webhook connection failed");
  });

  it("Case 6: handles non-Error network exception gracefully", async () => {
    mockWebhookRequest("Fatal discord socket error");

    const provider = new DiscordProvider(config);
    const result = await provider.send(sampleMessage);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Webhook connection failed");
  });
});
