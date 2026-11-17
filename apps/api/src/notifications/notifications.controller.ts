import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Patch,
  Param,
  ParseUUIDPipe,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesSchema,
  notificationKinds,
  type Role,
  type NotificationPreferences,
} from "@haihire/shared";
import { PermissionResolverService } from "../auth/permission-resolver.service";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { PrismaService } from "../prisma/prisma.service";

type NotificationRequest = {
  user: { id: string; organizationId: string; role: Role };
};

const preferencesSelect = {
  applicationWebsite: true,
  interviewWebsite: true,
  applicationEmail: true,
  interviewEmail: true,
} as const;

@Controller("notifications")
@UseGuards(JwtAuthGuard, ActiveTenantGuard)
export class NotificationsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionResolverService)
    private readonly permissions: PermissionResolverService,
  ) {}

  @Get()
  async list(@Request() { user }: NotificationRequest) {
    const [applications, interviews] = await Promise.all([
      this.permissions.resolvePermission(
        user.organizationId,
        user.role,
        "application:view",
      ),
      this.permissions.resolvePermission(
        user.organizationId,
        user.role,
        "interview:view",
      ),
    ]);
    const where = {
      organizationId: user.organizationId,
      userId: user.id,
      kind: {
        in: notificationKinds.filter((kind) =>
          kind === "applicationReceived" ? applications : interviews,
        ),
      },
    };
    const [items, unreadCount] = await this.prisma.withTenantRls(
      user.organizationId,
      (tx) =>
        Promise.all([
          tx.notification.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 30,
            select: {
              id: true,
              kind: true,
              resourceId: true,
              createdAt: true,
              readAt: true,
            },
          }),
          tx.notification.count({ where: { ...where, readAt: null } }),
        ]),
    );
    return { items, unreadCount };
  }

  @Patch("read")
  async readAll(@Request() { user }: NotificationRequest) {
    await this.prisma.withTenantRls(user.organizationId, (tx) =>
      tx.notification.updateMany({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      }),
    );
  }

  @Patch(":id/read")
  async readOne(
    @Request() { user }: NotificationRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.prisma.withTenantRls(user.organizationId, (tx) =>
      tx.notification.updateMany({
        where: {
          id,
          organizationId: user.organizationId,
          userId: user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      }),
    );
  }

  @Get("preferences")
  async getPreferences(@Request() { user }: NotificationRequest) {
    return (
      (await this.prisma.withTenantRls(user.organizationId, (tx) =>
        tx.notificationPreference.findUnique({
          where: {
            organizationId_userId: {
              organizationId: user.organizationId,
              userId: user.id,
            },
          },
          select: preferencesSelect,
        }),
      )) ?? DEFAULT_NOTIFICATION_PREFERENCES
    );
  }

  @Put("preferences")
  updatePreferences(
    @Request() { user }: NotificationRequest,
    @Body(DtoPipe(notificationPreferencesSchema)) body: NotificationPreferences,
  ) {
    const identity = { organizationId: user.organizationId, userId: user.id };
    return this.prisma.withTenantRls(user.organizationId, (tx) =>
      tx.notificationPreference.upsert({
        where: { organizationId_userId: identity },
        create: { ...identity, ...body },
        update: body,
        select: preferencesSelect,
      }),
    );
  }
}
