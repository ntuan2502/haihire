import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import { request } from "node:https";
import { vi } from "vitest";

export function mockWebhookRequest(outcome: number | Error | string) {
  const requestMock = vi.mocked(request);
  const destroy = vi.fn();
  const end = vi.fn<(body: string) => void>();
  requestMock.mockImplementation((_url, _options, onResponse) => {
    const outbound = new EventEmitter();
    end.mockImplementation(() => {
      if (typeof outcome === "number") {
        onResponse?.({
          statusCode: outcome,
          destroy,
        } as unknown as IncomingMessage);
      } else {
        outbound.emit("error", outcome);
      }
    });
    return Object.assign(outbound, { end }) as unknown as ClientRequest;
  });
  return { requestMock, end, destroy };
}
