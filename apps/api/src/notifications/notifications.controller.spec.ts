import { describe, expect, it, vi } from "vitest";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@haihire/shared";
import { NotificationsController } from "./notifications.controller";
import type { PrismaService } from "../prisma/prisma.service";

describe("NotificationsController preferences", () => {
  it("defaults website on and email off, and scopes reads and writes to the caller", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      interviewEmail: true,
    };
    const upsert = vi.fn().mockResolvedValue(preferences);
    const controller = new NotificationsController({
      notificationPreference: { findUnique, upsert },
    } as unknown as PrismaService);
    const request = { user: { id: "user-1", organizationId: "org-1" } };
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
});
