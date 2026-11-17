import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesSchema,
  type NotificationPreferences,
} from "@haihire/shared";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { PrismaService } from "../prisma/prisma.service";

type NotificationRequest = { user: { id: string; organizationId: string } };

const preferencesSelect = {
  applicationWebsite: true,
  interviewWebsite: true,
  applicationEmail: true,
  interviewEmail: true,
} as const;

@Controller("notifications")
@UseGuards(AuthGuard("jwt"), ActiveTenantGuard)
export class NotificationsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("preferences")
  async getPreferences(@Request() { user }: NotificationRequest) {
    return (
      (await this.prisma.notificationPreference.findUnique({
        where: {
          organizationId_userId: {
            organizationId: user.organizationId,
            userId: user.id,
          },
        },
        select: preferencesSelect,
      })) ?? DEFAULT_NOTIFICATION_PREFERENCES
    );
  }

  @Put("preferences")
  updatePreferences(
    @Request() { user }: NotificationRequest,
    @Body(DtoPipe(notificationPreferencesSchema)) body: NotificationPreferences,
  ) {
    const identity = { organizationId: user.organizationId, userId: user.id };
    return this.prisma.notificationPreference.upsert({
      where: { organizationId_userId: identity },
      create: { ...identity, ...body },
      update: body,
      select: preferencesSelect,
    });
  }
}
