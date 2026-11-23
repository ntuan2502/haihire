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
    ).resolves.toEqual({
      items: [],
      unreadCount: 0,
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
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

  it("supports status, kind, and pagination filters while keeping global unreadCount and enforcing RBAC", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi
      .fn()
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);
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

    const res = await controller.list(
      {
        user: { id: "user-1", organizationId: "org-1", role: Role.INTERVIEWER },
      },
      { page: 2, limit: 10, status: "read", kind: "interviewScheduled" },
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          userId: "user-1",
          kind: { in: ["interviewScheduled"] },
          readAt: { not: null },
        },
        skip: 10,
        take: 10,
      }),
    );
    expect(res).toEqual({
      items: [],
      unreadCount: 5,
      total: 2,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    // Filtering by a category without RBAC access returns empty kind set and still preserves global unreadCount
    await controller.list(
      {
        user: { id: "user-1", organizationId: "org-1", role: Role.INTERVIEWER },
      },
      { status: "unread", kind: "applicationReceived" },
    );
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          userId: "user-1",
          kind: { in: [] },
          readAt: null,
        },
        skip: 0,
        take: 20,
      }),
    );
  });

  it("marks a single read notification back as unread scoped to caller and org", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = { notification: { updateMany } };
    const controller = new NotificationsController(
      {
        withTenantRls: (
          _organizationId: string,
          execute: (tx: typeof transaction) => unknown,
        ) => execute(transaction),
      } as unknown as PrismaService,
      {} as PermissionResolverService,
    );

    await controller.unreadOne(
      {
        user: { id: "user-1", organizationId: "org-1", role: Role.RECRUITER },
      },
      "notif-99",
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "notif-99",
        organizationId: "org-1",
        userId: "user-1",
        readAt: { not: null },
      },
      data: { readAt: null },
    });
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
              displayName: null,
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
                displayName: null,
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

    expect(transaction.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          candidate: {
            select: { displayName: true, firstName: true, lastName: true },
          },
        }),
      }),
    );
    expect(transaction.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          application: expect.objectContaining({
            select: expect.objectContaining({
              candidate: {
                select: { displayName: true, firstName: true, lastName: true },
              },
            }),
          }),
        }),
      }),
    );
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
