import { lookup, type LookupAddress } from "node:dns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockWebhookRequest } from "../../test/helpers/mock-webhook-request";
import { postWebhook, validateWebhookDestination } from "./webhook-http";

vi.mock("node:https", () => ({ request: vi.fn() }));
vi.mock("node:dns", () => ({ lookup: vi.fn() }));

const webhookUrl = "https://hooks.example.com/receive";
const lookupAll = vi.mocked(
  lookup as (
    hostname: string,
    options: { all: true },
    callback: (
      error: NodeJS.ErrnoException | null,
      addresses: LookupAddress[],
    ) => void,
  ) => void,
);

describe("Webhook HTTP transport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unsafe literal addresses before opening a connection", async () => {
    const { requestMock } = mockWebhookRequest(204);
    for (const host of [
      "127.1",
      "0x7f000001",
      "169.254.169.254",
      "[::1]",
      "[::ffff:10.0.0.1]",
      "[2002:7f00:1::1]",
    ]) {
      expect(
        await postWebhook("GENERIC", `https://${host}/hook`, "{}"),
      ).toMatchObject({ success: false });
    }
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("supports public IPv4 and IPv6 destinations", () => {
    expect(
      validateWebhookDestination("GENERIC", "https://1.1.1.1/hook"),
    ).toBeNull();
    expect(
      validateWebhookDestination(
        "GENERIC",
        "https://[2606:4700:4700::1111]/hook",
      ),
    ).toBeNull();
  });

  it("validates legacy saved URLs against their provider before delivery", async () => {
    const { requestMock } = mockWebhookRequest(204);
    expect(await postWebhook("TELEGRAM", webhookUrl, "{}")).toMatchObject({
      success: false,
    });
    expect(await postWebhook("DISCORD", webhookUrl, "{}")).toMatchObject({
      success: false,
    });
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("rejects a DNS answer containing both public and private addresses", async () => {
    const { requestMock } = mockWebhookRequest(204);
    lookupAll.mockImplementation((_hostname, _options, callback) => {
      callback(null, [
        { address: "1.1.1.1", family: 4 },
        { address: "fd00::123", family: 6 },
      ]);
    });
    await postWebhook("GENERIC", webhookUrl, "{}");
    const options = requestMock.mock.calls[0][1];

    const callback = vi.fn();
    options?.lookup?.("hooks.example.com", { all: true }, callback);

    expect(lookup).toHaveBeenCalledWith(
      "hooks.example.com",
      { all: true },
      expect.any(Function),
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Webhook destination must resolve to a public address",
      }),
      "",
    );
  });

  it("passes vetted DNS answers directly to the HTTPS connection with the original hostname", async () => {
    const { requestMock } = mockWebhookRequest(204);
    const addresses: LookupAddress[] = [{ address: "1.1.1.1", family: 4 }];
    lookupAll.mockImplementation((_hostname, _options, callback) => {
      callback(null, addresses);
    });
    await postWebhook("GENERIC", webhookUrl, "{}");
    const [destination, options] = requestMock.mock.calls[0];
    const callback = vi.fn();
    options?.lookup?.("hooks.example.com", { all: true }, callback);

    expect(destination).toEqual(new URL(webhookUrl));
    expect(options?.agent).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, addresses);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("does not follow a redirect and discards the remote response body", async () => {
    const { requestMock, destroy } = mockWebhookRequest(307);

    expect(await postWebhook("GENERIC", webhookUrl, "{}")).toEqual({
      success: false,
      statusCode: 307,
      errorMessage: "Webhook returned HTTP 307",
    });
    expect(requestMock).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("sets a request deadline and reports a safe timeout message", async () => {
    const { requestMock } = mockWebhookRequest(
      new Error("sensitive connection information"),
    );
    const signal = AbortSignal.abort();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValueOnce(signal);
    try {
      expect(await postWebhook("GENERIC", webhookUrl, "{}")).toEqual({
        success: false,
        errorMessage: "Webhook request timed out",
      });
      expect(timeout).toHaveBeenCalledWith(5000);
      expect(requestMock.mock.calls[0][1]?.signal).toBe(signal);
    } finally {
      timeout.mockRestore();
    }
  });
});
