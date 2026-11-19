import { describe, expect, it, vi } from "vitest";
import { DEFAULT_NOTIFICATION_PREFERENCES, Role } from "@haihire/shared";
import { NotificationsController } from "./notifications.controller";
import type { PermissionResolverService } from "../auth/permission-resolver.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("NotificationsController preferences", () => {
  it("defaults website on and email off, and scopes reads and writes to the caller", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      interviewEmail: true,
    };
    const upsert = vi.fn().mockResolvedValue(preferences);
    const transaction = { notificationPreference: { findUnique, upsert } };
    const controller = new NotificationsController(
      {
        withTenantRls: (
          _organizationId: string,
          execute: (tx: typeof transaction) => unknown,
        ) => execute(transaction),
      } as unknown as PrismaService,
      {} as PermissionResolverService,
    );
    const request = {
      user: { id: "user-1", organizationId: "org-1", role: Role.RECRUITER },
    };
    const identity = { userId: "user-1", organizationId: "org-1" };

    await expect(controller.getPreferences(request)).resolves.toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_userId: identity },
      }),
    );
    await expect(
      controller.updatePreferences(request, preferences),
    ).resolves.toEqual(preferences);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_userId: identity },
        create: { ...identity, ...preferences },
        update: preferences,
      }),
    );
  });

  it("limits the inbox to the caller and event categories they can still view", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const transaction = { notification: { findMany, count } };
    const controller = new NotificationsController(
      {
        withTenantRls: (
          _organizationId: string,
          execute: (tx: typeof transaction) => unknown,
        ) => execute(transaction),
      } as unknown as PrismaService,
      {
        resolvePermission: vi.fn(
          async (_organizationId, _role, permission) =>
            permission === "interview:view",
        ),
      } as unknown as PermissionResolverService,
    );

    await expect(
      controller.list({
        user: { id: "user-1", organizationId: "org-1", role: Role.INTERVIEWER },
      }),
    ).resolves.toEqual({ items: [], unreadCount: 0 });
    const where = {
      organizationId: "org-1",
      userId: "user-1",
      kind: {
        in: ["interviewScheduled", "interviewChanged", "interviewCancelled"],
      },
    };
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(count).toHaveBeenCalledWith({ where: { ...where, readAt: null } });
  });

  it("enriches notification items with candidateName, jobTitle, scheduledAt, and round", async () => {
    const createdAt = new Date("2026-11-19T04:00:00.000Z");
    const scheduledAt = new Date("2026-11-20T07:30:00.000Z");
    const transaction = {
      organization: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ nameDisplayOrder: "LAST_FIRST" }),
      },
      notification: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "notif-1",
            kind: "applicationReceived",
            resourceId: "app-1",
            createdAt,
            readAt: null,
          },
          {
            id: "notif-2",
            kind: "interviewScheduled",
            resourceId: "int-1",
            createdAt,
            readAt: createdAt,
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      application: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "app-1",
            candidate: {
              name: "An Nguyen",
              firstName: "An",
              lastName: "Nguyen",
            },
            job: { title: "Senior Backend Engineer" },
          },
        ]),
      },
      interview: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "int-1",
            scheduledAt,
            round: 2,
            application: {
              candidate: {
                name: "Binh Tran",
                firstName: "Binh",
                lastName: "Tran",
              },
              job: { title: "Product Designer" },
            },
          },
        ]),
      },
    };
    const controller = new NotificationsController(
      {
        withTenantRls: (
          _organizationId: string,
          execute: (tx: typeof transaction) => unknown,
        ) => execute(transaction),
      } as unknown as PrismaService,
      {
        resolvePermission: vi.fn().mockResolvedValue(true),
      } as unknown as PermissionResolverService,
    );

    const result = await controller.list({
      user: { id: "user-1", organizationId: "org-1", role: Role.ADMIN },
    });

    expect(result.unreadCount).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "notif-1",
        kind: "applicationReceived",
        resourceId: "app-1",
        candidateName: "Nguyen An",
        jobTitle: "Senior Backend Engineer",
      }),
      expect.objectContaining({
        id: "notif-2",
        kind: "interviewScheduled",
        resourceId: "int-1",
        candidateName: "Tran Binh",
        jobTitle: "Product Designer",
        scheduledAt: scheduledAt.toISOString(),
        round: 2,
      }),
    ]);
  });
});
