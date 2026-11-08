import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const correlationStorage = new AsyncLocalStorage<{ requestId: string }>();

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers["x-request-id"];
    const requestId =
      (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) || randomUUID();

    res.setHeader("X-Request-ID", requestId);

    correlationStorage.run({ requestId }, () => {
      next();
    });
  }
}
