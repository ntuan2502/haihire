import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface CorrelationContext {
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

function extractClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof rawForwarded === "string" && rawForwarded.trim()) {
    const firstIp = rawForwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp.slice(0, 128);
  }
  const direct = req.ip || req.socket?.remoteAddress;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim().slice(0, 128);
  }
  return null;
}

function extractUserAgent(req: Request): string | null {
  const rawUa = req.headers["user-agent"];
  const ua = Array.isArray(rawUa) ? rawUa[0] : rawUa;
  if (typeof ua === "string" && ua.trim()) {
    return ua.trim().slice(0, 512);
  }
  return null;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers["x-request-id"];
    const requestId =
      (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) || randomUUID();

    res.setHeader("X-Request-ID", requestId);

    const ipAddress = extractClientIp(req);
    const userAgent = extractUserAgent(req);

    correlationStorage.run({ requestId, ipAddress, userAgent }, () => {
      next();
    });
  }
}
