import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  Role,
  type NotificationKind,
} from "@haihire/shared";
import type { PermissionResolverService } from "../auth/permission-resolver.service";
import type { PrismaService } from "../prisma/prisma.service";

export interface NotificationEvent {
  organizationId: string;
  userId: string;
  kind: NotificationKind;
  resourceId: string;
}

export async function resolveNotificationRecipient(
  prisma: PrismaService,
  permissions: PermissionResolverService,
  event: NotificationEvent,
) {
  const { organizationId, userId, kind } = event;
  const identity = { organizationId, userId };
  const [membership, owned, preferences, user] = await Promise.all([
    prisma.organizationMember.findUnique({
      where: { organizationId_userId: identity },
      select: { role: true },
    }),
    prisma.organization.findFirst({
      where: { id: organizationId, ownerId: userId },
      select: { id: true },
    }),
    prisma.notificationPreference.findUnique({
      where: { organizationId_userId: identity },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, preferredLanguage: true },
    }),
  ]);
  const role = owned ? Role.ADMIN : membership?.role;
  const application = kind === "applicationReceived";
  if (
    !user ||
    !role ||
    !(await permissions.resolvePermission(
      organizationId,
      role,
      application ? "application:view" : "interview:view",
    ))
  )
    return null;

  const options = preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    user,
    website: application
      ? options.applicationWebsite
      : options.interviewWebsite,
    email: application ? options.applicationEmail : options.interviewEmail,
  };
}
