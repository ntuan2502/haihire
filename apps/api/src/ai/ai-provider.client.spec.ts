import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  assertSafeAiEndpointUrl,
  callAiCompletion,
} from "./ai-provider.client";

describe("ai-provider.client SSRF protection", () => {
  afterEach(() => {
    delete process.env.AI_ALLOWED_INTERNAL_HOSTS;
    vi.restoreAllMocks();
  });

  it("blocks http://, localhost, loopback, private RFC1918, metadata, IPv6-mapped IPv4, internal hosts, and credentials", () => {
    const blockedUrls = [
      "http://api.openai.com/v1",
      "https://localhost/v1",
      "https://127.0.0.1:8080/v1",
      "https://[::1]/v1",
      "https://10.0.0.12/v1",
      "https://172.16.5.10/v1",
      "https://192.168.1.50/v1",
      "https://169.254.169.254/latest/meta-data",
      "https://[::ffff:169.254.169.254]/latest/meta-data",
      "https://redis:6379",
      "https://user:pass@api.openai.com/v1",
    ];

    for (const url of blockedUrls) {
      expect(() => assertSafeAiEndpointUrl(url)).toThrow();
    }
  });

  it("allows valid HTTPS public provider endpoints and explicitly allowlisted internal hosts", () => {
    expect(assertSafeAiEndpointUrl("https://api.openai.com/v1").hostname).toBe(
      "api.openai.com",
    );

    process.env.AI_ALLOWED_INTERNAL_HOSTS = "ollama,localhost";
    expect(assertSafeAiEndpointUrl("http://ollama:11434/v1").hostname).toBe(
      "ollama",
    );
    expect(() =>
      assertSafeAiEndpointUrl("https://169.254.169.254/latest/meta-data"),
    ).toThrow();
  });

  it("passes redirect: 'error' when calling external AI endpoints", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const out = await callAiCompletion({
      provider: "OPENAI",
      modelId: "gpt-6.2-sol",
      apiKey: "sk-test",
      systemPrompt: "sys",
      userPrompt: "usr",
    });

    expect(out).toBe("ok");
    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.redirect).toBe("error");
    expect(APP_ERROR_CODES.VALIDATION_ERROR).toBeDefined();
  });
});
