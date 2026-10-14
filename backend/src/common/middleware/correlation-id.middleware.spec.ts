import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  CorrelationIdMiddleware,
  correlationStorage,
} from "./correlation-id.middleware";
import { CorrelationLogger } from "../logger/correlation-logger.service";

describe("CorrelationIdMiddleware & CorrelationLogger", () => {
  const middleware = new CorrelationIdMiddleware();

  it("generates a new UUID v4 when X-Request-ID header is missing", () => {
    const req = {
      headers: {},
    } as unknown as Request;

    let responseHeaderValue = "";
    const res = {
      setHeader: vi.fn().mockImplementation((name: string, val: string) => {
        if (name === "X-Request-ID") {
          responseHeaderValue = val;
        }
      }),
    } as unknown as Response;

    let capturedIdInContext = "";
    const next: NextFunction = vi.fn().mockImplementation(() => {
      capturedIdInContext = correlationStorage.getStore()?.requestId || "";
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", expect.any(String));
    expect(responseHeaderValue).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(capturedIdInContext).toBe(responseHeaderValue);
  });

  it("preserves incoming client X-Request-ID header and sets it on response", () => {
    const customId = "client-trace-id-12345";
    const req = {
      headers: {
        "x-request-id": customId,
      },
    } as unknown as Request;

    let responseHeaderValue = "";
    const res = {
      setHeader: vi.fn().mockImplementation((name: string, val: string) => {
        if (name === "X-Request-ID") {
          responseHeaderValue = val;
        }
      }),
    } as unknown as Response;

    let capturedIdInContext = "";
    const next: NextFunction = vi.fn().mockImplementation(() => {
      capturedIdInContext = correlationStorage.getStore()?.requestId || "";
    });

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", customId);
    expect(responseHeaderValue).toBe(customId);
    expect(capturedIdInContext).toBe(customId);
  });

  it("handles array X-Request-ID header gracefully by selecting the first entry", () => {
    const req = {
      headers: {
        "x-request-id": ["first-id-abc", "second-id-def"],
      },
    } as unknown as Request;

    let responseHeaderValue = "";
    const res = {
      setHeader: vi.fn().mockImplementation((name: string, val: string) => {
        if (name === "X-Request-ID") {
          responseHeaderValue = val;
        }
      }),
    } as unknown as Response;

    const next: NextFunction = vi.fn();
    middleware.use(req, res, next);

    expect(responseHeaderValue).toBe("first-id-abc");
  });

  describe("CorrelationLogger", () => {
    const logger = new CorrelationLogger();

    it("formats message with [requestId] prefix when inside correlation context", () => {
      const formatted = correlationStorage.run({ requestId: "trace-999" }, () => {
        // Access protected formatMessage via prototype
        return (logger as unknown as {
          formatMessage: (
            level: string,
            msg: unknown,
            pid: string,
            formattedLevel: string,
            context?: string,
          ) => string;
        }).formatMessage("log", "User logged in", "", "", "AuthService");
      });

      expect(formatted).toBe("[trace-999] [AuthService] User logged in\n");
    });

    it("formats message with [no-correlation] fallback when outside correlation context", () => {
      const formatted = (logger as unknown as {
        formatMessage: (
          level: string,
          msg: unknown,
          pid: string,
          formattedLevel: string,
          context?: string,
        ) => string;
      }).formatMessage("log", "Background daemon tick", "", "", "CronService");

      expect(formatted).toBe("[no-correlation] [CronService] Background daemon tick\n");
    });

    it("handles logs without a context parameter cleanly", () => {
      const formatted = correlationStorage.run({ requestId: "trace-simple" }, () => {
        return (logger as unknown as {
          formatMessage: (
            level: string,
            msg: unknown,
            pid: string,
            formattedLevel: string,
            context?: string,
          ) => string;
        }).formatMessage("log", "Simple un-contextual message", "", "");
      });

      expect(formatted).toBe("[trace-simple] Simple un-contextual message\n");
    });
  });
});
