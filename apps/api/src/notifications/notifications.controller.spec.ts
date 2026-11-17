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
});
