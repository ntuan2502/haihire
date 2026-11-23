import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { createHash } from "node:crypto";
import type { NotificationKind } from "@haihire/shared";
import { PermissionResolverService } from "../auth/permission-resolver.service";
import { PrismaService } from "../prisma/prisma.service";
import { EMAIL_QUEUE_NAME } from "../email/email.processor";
import { resolveNotificationRecipient } from "./notification-recipient";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionResolverService)
    private readonly permissions: PermissionResolverService,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  async publish(
    organizationId: string,
    userId: string | null | undefined,
    kind: NotificationKind,
    resourceId: string,
    revision = "",
  ) {
    if (!userId) return;
    const event = { organizationId, userId, kind, resourceId };
    try {
      const recipient = await this.prisma.withTenantRls(
        organizationId,
        async (tx) => {
          const recipient = await resolveNotificationRecipient(
            tx,
            this.permissions,
            event,
          );
          if (recipient?.website) {
            await tx.notification.create({ data: event });
          }
          return recipient;
        },
      );
      if (recipient?.email) {
        const key = createHash("sha256")
          .update(
            JSON.stringify([
              organizationId,
              userId,
              kind,
              resourceId,
              revision,
            ]),
          )
          .digest("hex");
        await this.emailQueue.add("send-notification-email", event, {
          jobId: `notification-${key}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10000 },
        });
      }
    } catch (error) {
      this.logger.error("Failed to publish notification", error);
    }
  }
}
