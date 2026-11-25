import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { APP_ERROR_CODES, USER_SECURITY_ACTIONS } from "@haihire/shared";
import {
  AppNotFoundException,
  AppUnauthorizedException,
} from "../common/app-exception";
import { toInstant } from "../common/date.util";
import { correlationStorage } from "../common/middleware/correlation-id.middleware";
import { PrismaService } from "../prisma/prisma.service";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_ACTIVE_TOUCH_INTERVAL_MS = 60 * 1000;

const LOGIN_CATEGORY_ACTIONS = [
  USER_SECURITY_ACTIONS.AUTH_LOGIN,
  USER_SECURITY_ACTIONS.AUTH_LOGIN_FAILED,
  USER_SECURITY_ACTIONS.AUTH_LOGOUT,
];

const SECURITY_CATEGORY_ACTIONS = [
  USER_SECURITY_ACTIONS.AUTH_PASSWORD_CHANGED,
  USER_SECURITY_ACTIONS.AUTH_SESSION_REVOKED,
  USER_SECURITY_ACTIONS.AUTH_ALL_SESSIONS_REVOKED,
  USER_SECURITY_ACTIONS.ACCOUNT_PROFILE_UPDATED,
];

export interface SecurityLogsListOptions {
  category?: "all" | "login" | "security";
  limit?: number;
  offset?: number;
}

@Injectable()
export class UserSecurityService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private parseMetadata(value: unknown): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (typeof value === "object") {
      return value as Record<string, unknown>;
    }
    return null;
  }

  async createSession(userId: string): Promise<string | null> {
    if (typeof this.prisma.userSession?.create !== "function") {
      return null;
    }

    const now = toInstant();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const correlation = correlationStorage.getStore();
    const sessionId = crypto.randomUUID();

    try {
      await this.prisma.userSession.create({
        data: {
          id: sessionId,
          userId,
          ipAddress: correlation?.ipAddress ?? null,
          userAgent: correlation?.userAgent ?? null,
          lastActiveAt: now,
          expiresAt,
          createdAt: now,
        },
      });
      return sessionId;
    } catch {
      return null;
    }
  }

  async validateSession(sessionId: string, userId: string): Promise<void> {
    if (typeof this.prisma.userSession?.findUnique !== "function") {
      return;
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        expiresAt: true,
        lastActiveAt: true,
      },
    });

    const now = toInstant();
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt !== null ||
      new Date(session.expiresAt).getTime() <= now.getTime()
    ) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.UNAUTHORIZED,
        "Session has been revoked or expired",
      );
    }

    const lastActiveMs = new Date(session.lastActiveAt).getTime();
    if (
      now.getTime() - lastActiveMs > LAST_ACTIVE_TOUCH_INTERVAL_MS &&
      typeof this.prisma.userSession?.update === "function"
    ) {
      const correlation = correlationStorage.getStore();
      void this.prisma.userSession
        .update({
          where: { id: sessionId },
          data: {
            lastActiveAt: now,
            ...(correlation?.ipAddress
              ? { ipAddress: correlation.ipAddress }
              : {}),
            ...(correlation?.userAgent
              ? { userAgent: correlation.userAgent }
              : {}),
          },
        })
        .catch(() => undefined);
    }
  }

  async refreshSession(sessionId: string, userId: string): Promise<void> {
    if (typeof this.prisma.userSession?.findUnique !== "function") {
      return;
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    const now = toInstant();
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt !== null ||
      new Date(session.expiresAt).getTime() <= now.getTime()
    ) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "Session has been revoked or expired",
      );
    }

    if (typeof this.prisma.userSession?.update === "function") {
      const correlation = correlationStorage.getStore();
      await this.prisma.userSession.update({
        where: { id: sessionId },
        data: {
          lastActiveAt: now,
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
          ...(correlation?.ipAddress
            ? { ipAddress: correlation.ipAddress }
            : {}),
          ...(correlation?.userAgent
            ? { userAgent: correlation.userAgent }
            : {}),
        },
      });
    }
  }

  async listActiveSessions(userId: string, currentSessionId?: string | null) {
    if (typeof this.prisma.userSession?.findMany !== "function") {
      return [];
    }

    const now = toInstant();
    const rows = await this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      lastActiveAt: row.lastActiveAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      isCurrent: Boolean(currentSessionId && row.id === currentSessionId),
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    if (typeof this.prisma.userSession?.findUnique !== "function") {
      return { success: true };
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        revokedAt: true,
      },
    });

    if (!session || session.userId !== userId || session.revokedAt !== null) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.RESOURCE_NOT_FOUND,
        "Active session not found",
        { sessionId },
      );
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: toInstant() },
    });

    await this.logEvent(
      userId,
      USER_SECURITY_ACTIONS.AUTH_SESSION_REVOKED,
      "SUCCESS",
      {
        targetSessionId: session.id,
        targetIpAddress: session.ipAddress ?? null,
        targetUserAgent: session.userAgent ?? null,
      },
    );

    return { success: true };
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionId?: string | null,
  ): Promise<{ success: boolean; revokedCount: number }> {
    if (typeof this.prisma.userSession?.updateMany !== "function") {
      return { success: true, revokedCount: 0 };
    }

    const result = await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { revokedAt: toInstant() },
    });

    await this.logEvent(
      userId,
      USER_SECURITY_ACTIONS.AUTH_ALL_SESSIONS_REVOKED,
      "SUCCESS",
      { revokedCount: result.count },
    );

    return { success: true, revokedCount: result.count };
  }

  async revokeAllSessions(userId: string): Promise<void> {
    if (typeof this.prisma.userSession?.updateMany !== "function") {
      return;
    }

    await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: toInstant() },
    });
  }

  async revokeSessionQuietly(
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    if (typeof this.prisma.userSession?.updateMany !== "function") {
      return false;
    }

    try {
      await this.prisma.userSession.updateMany({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
        },
        data: { revokedAt: toInstant() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async logEvent(
    userId: string,
    action: string,
    status: "SUCCESS" | "WARNING" = "SUCCESS",
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    if (typeof this.prisma.userSecurityLog?.create !== "function") {
      return;
    }

    const correlation = correlationStorage.getStore();

    try {
      await this.prisma.userSecurityLog.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          action,
          status,
          ipAddress: correlation?.ipAddress ?? null,
          userAgent: correlation?.userAgent ?? null,
          requestId: correlation?.requestId ?? null,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
          createdAt: toInstant(),
        },
      });
    } catch {
      // Fail-open so security logging never blocks primary authentication flow
    }
  }

  async listSecurityLogs(userId: string, options?: SecurityLogsListOptions) {
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);

    if (
      typeof this.prisma.userSecurityLog?.findMany !== "function" ||
      typeof this.prisma.userSecurityLog?.count !== "function"
    ) {
      return { data: [], total: 0, limit, offset };
    }

    const category = options?.category ?? "all";
    const where: Prisma.UserSecurityLogWhereInput = { userId };
    if (category === "login") {
      where.action = { in: LOGIN_CATEGORY_ACTIONS };
    } else if (category === "security") {
      where.action = { in: SECURITY_CATEGORY_ACTIONS };
    }

    const [rows, total] = await Promise.all([
      this.prisma.userSecurityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.userSecurityLog.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        action: row.action,
        status: row.status,
        ipAddress: row.ipAddress ?? null,
        userAgent: row.userAgent ?? null,
        requestId: row.requestId ?? null,
        metadata: this.parseMetadata(row.metadata),
        createdAt: row.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }
}
