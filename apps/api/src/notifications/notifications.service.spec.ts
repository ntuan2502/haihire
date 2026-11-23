import { describe, expect, it, vi } from "vitest";
import { Role } from "@haihire/shared";
import { NotificationsService } from "./notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { PermissionResolverService } from "../auth/permission-resolver.service";
import type { Queue } from "bullmq";

function setup(website: boolean, email: boolean, allowed = true) {
  const create = vi.fn();
  const add = vi.fn();
  const tx = {
    organizationMember: {
      findUnique: vi.fn().mockResolvedValue({ role: Role.RECRUITER }),
    },
    organization: { findFirst: vi.fn().mockResolvedValue(null) },
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: "member@example.com" }),
    },
    notificationPreference: {
      findUnique: vi.fn().mockResolvedValue({
        interviewWebsite: website,
        interviewEmail: email,
      }),
    },
    notification: { create },
  };
  const withTenantRls = vi.fn(async (_orgId, execute) => execute(tx));
  const resolvePermission = vi.fn().mockResolvedValue(allowed);
  const service = new NotificationsService(
    { withTenantRls } as unknown as PrismaService,
    { resolvePermission } as unknown as PermissionResolverService,
    { add } as unknown as Queue,
  );
  return { service, tx, create, add, withTenantRls, resolvePermission };
}

describe("NotificationsService", () => {
  it.each([
    [true, false],
    [false, true],
    [true, true],
    [false, false],
  ])(
    "uses the website (%s) and email (%s) preferences independently",
    async (website, email) => {
      const { service, tx, create, add, withTenantRls, resolvePermission } =
        setup(website, email);
      await service.publish(
        "org-1",
        "user-1",
        "interviewChanged",
        "interview-1",
        "rev-1",
      );

      expect(withTenantRls).toHaveBeenCalledWith("org-1", expect.any(Function));
      expect(tx.organizationMember.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId_userId: {
              organizationId: "org-1",
              userId: "user-1",
            },
          },
        }),
      );
      expect(resolvePermission).toHaveBeenCalledWith(
        "org-1",
        Role.RECRUITER,
        "interview:view",
      );
      expect(create).toHaveBeenCalledTimes(website ? 1 : 0);
      expect(add).toHaveBeenCalledTimes(email ? 1 : 0);
    },
  );

  it("skips both channels when the member lacks access", async () => {
    const { service, create, add } = setup(true, true, false);
    await service.publish(
      "org-1",
      "user-1",
      "interviewScheduled",
      "interview-1",
    );
    expect(create).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it("uses the same queue job key when publishing the same email revision again", async () => {
    const { service, add } = setup(false, true);
    await service.publish(
      "org-1",
      "user-1",
      "interviewChanged",
      "interview-1",
      "rev-1",
    );
    await service.publish(
      "org-1",
      "user-1",
      "interviewChanged",
      "interview-1",
      "rev-1",
    );
    await service.publish(
      "org-1",
      "user-1",
      "interviewChanged",
      "interview-1",
      "rev-2",
    );
    expect(add.mock.calls[0][2].jobId).toBe(add.mock.calls[1][2].jobId);
    expect(add.mock.calls[0][2].jobId).not.toBe(add.mock.calls[2][2].jobId);
  });
});
