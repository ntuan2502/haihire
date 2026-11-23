import {
  Body,
  Controller,
  Get,
  Inject,
  Optional,
  Put,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  formatCandidateDisplayName,
  listNotificationsQuerySchema,
  notificationPreferencesSchema,
  notificationKinds,
  type ListNotificationsQuery,
  type Role,
  type NotificationPreferences,
} from "@haihire/shared";
import { resolveOrgNameDisplayOrder } from "../common/candidate-name.util";
import { PermissionResolverService } from "../auth/permission-resolver.service";
import { DtoPipe } from "../common/dto-validation.pipe";
import { EventsService } from "../events/events.service";
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
    @Optional()
    @Inject(EventsService)
    private readonly events?: EventsService,
  ) {}

  @Get()
  async list(
    @Request() { user }: NotificationRequest,
    @Query(DtoPipe(listNotificationsQuerySchema))
    query: ListNotificationsQuery = {},
  ) {
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
    const allowedKinds = notificationKinds.filter((kind) =>
      kind === "applicationReceived" ? applications : interviews,
    );
    const filteredKinds =
      query.kind && query.kind !== "all"
        ? allowedKinds.includes(query.kind)
          ? [query.kind]
          : []
        : allowedKinds;

    const baseWhere = {
      organizationId: user.organizationId,
      userId: user.id,
      kind: { in: allowedKinds },
    };
    const filteredWhere = {
      organizationId: user.organizationId,
      userId: user.id,
      kind: { in: filteredKinds },
      ...(query.status === "unread"
        ? { readAt: null }
        : query.status === "read"
          ? { readAt: { not: null } }
          : {}),
    };

    const hasQueryParams =
      query.page !== undefined ||
      query.limit !== undefined ||
      query.status !== undefined ||
      query.kind !== undefined;
    const page = query.page ?? 1;
    const limit = query.limit ?? (hasQueryParams ? 20 : 30);
    const skip = (page - 1) * limit;

    return this.prisma.withTenantRls(user.organizationId, async (tx) => {
      const [rawItems, unreadCount, total] = await Promise.all([
        tx.notification.findMany({
          where: filteredWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip,
          take: limit,
          select: {
            id: true,
            kind: true,
            resourceId: true,
            createdAt: true,
            readAt: true,
          },
        }),
        tx.notification.count({
          where: { ...baseWhere, readAt: null },
        }),
        tx.notification.count({
          where: filteredWhere,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      if (rawItems.length === 0) {
        return {
          items: rawItems,
          unreadCount,
          total,
          page,
          limit,
          totalPages,
        };
      }

      const appIds = rawItems
        .filter((item) => item.kind === "applicationReceived")
        .map((item) => item.resourceId);
      const interviewIds = rawItems
        .filter((item) => item.kind !== "applicationReceived")
        .map((item) => item.resourceId);

      const nameOrder = await resolveOrgNameDisplayOrder(
        tx,
        user.organizationId,
      );
      const appRows =
        appIds.length > 0 && tx.application?.findMany
          ? await tx.application.findMany({
              where: {
                id: { in: appIds },
                organizationId: user.organizationId,
                candidate: { deletedAt: null },
                job: { deletedAt: null },
              },
              select: {
                id: true,
                candidate: {
                  select: {
                    displayName: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                job: { select: { title: true } },
              },
            })
          : [];
      const interviewRows =
        interviewIds.length > 0 && tx.interview?.findMany
          ? await tx.interview.findMany({
              where: {
                id: { in: interviewIds },
                organizationId: user.organizationId,
                application: {
                  candidate: { deletedAt: null },
                  job: { deletedAt: null },
                },
              },
              select: {
                id: true,
                scheduledAt: true,
                round: true,
                application: {
                  select: {
                    candidate: {
                      select: {
                        displayName: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                    job: { select: { title: true } },
                  },
                },
              },
            })
          : [];

      const cancelledFallbackAppIds = rawItems
        .filter(
          (item) =>
            item.kind === "interviewCancelled" && item.resourceId.includes("|"),
        )
        .map((item) => item.resourceId.split("|")[1])
        .filter((appId): appId is string => Boolean(appId));

      const extraAppIds = cancelledFallbackAppIds.filter(
        (id) => !appIds.includes(id),
      );
      const extraAppRows =
        extraAppIds.length > 0 && tx.application?.findMany
          ? await tx.application.findMany({
              where: {
                id: { in: extraAppIds },
                organizationId: user.organizationId,
                candidate: { deletedAt: null },
                job: { deletedAt: null },
              },
              select: {
                id: true,
                candidate: {
                  select: {
                    displayName: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                job: { select: { title: true } },
              },
            })
          : [];

      const appMap = new Map(
        [...appRows, ...extraAppRows].map((row) => [row.id, row]),
      );
      const interviewMap = new Map(interviewRows.map((row) => [row.id, row]));

      const enriched = rawItems.map((item) => {
        if (item.kind === "applicationReceived") {
          const app = appMap.get(item.resourceId);
          if (!app) return item;
          return {
            ...item,
            candidateName:
              formatCandidateDisplayName(app.candidate, nameOrder) || null,
            jobTitle: app.job?.title ?? null,
          };
        }
        const intv = interviewMap.get(item.resourceId);
        if (intv) {
          return {
            ...item,
            candidateName:
              formatCandidateDisplayName(
                intv.application?.candidate,
                nameOrder,
              ) || null,
            jobTitle: intv.application?.job?.title ?? null,
            scheduledAt:
              (intv.scheduledAt as Date | string) instanceof Date
                ? (intv.scheduledAt as Date).toISOString()
                : String(intv.scheduledAt),
            round: intv.round ?? null,
          };
        }
        if (
          item.kind === "interviewCancelled" &&
          item.resourceId.includes("|")
        ) {
          const [origId, fallbackAppId, fallbackScheduledAt, fallbackRound] =
            item.resourceId.split("|");
          const fallbackApp = fallbackAppId
            ? appMap.get(fallbackAppId)
            : undefined;
          return {
            ...item,
            resourceId: origId || item.resourceId,
            candidateName: fallbackApp
              ? formatCandidateDisplayName(fallbackApp.candidate, nameOrder) ||
                null
              : null,
            jobTitle: fallbackApp?.job?.title ?? null,
            scheduledAt: fallbackScheduledAt || null,
            round:
              fallbackRound && !Number.isNaN(Number(fallbackRound))
                ? Number(fallbackRound)
                : null,
          };
        }
        return item;
      });

      return {
        items: enriched,
        unreadCount,
        total,
        page,
        limit,
        totalPages,
      };
    });
  }

  private emitChanged(user: NotificationRequest["user"]) {
    this.events?.emit({
      type: "NOTIFICATIONS_CHANGED",
      targetUserId: user.id,
      organizationId: user.organizationId,
    });
  }

  @Patch("read")
  async readAll(@Request() { user }: NotificationRequest) {
    const res = await this.prisma.withTenantRls(user.organizationId, (tx) =>
      tx.notification.updateMany({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      }),
    );
    if (res?.count !== 0) {
      this.emitChanged(user);
    }
  }

  @Patch(":id/read")
  async readOne(
    @Request() { user }: NotificationRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const res = await this.prisma.withTenantRls(user.organizationId, (tx) =>
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
    if (res?.count !== 0) {
      this.emitChanged(user);
    }
  }

  @Patch(":id/unread")
  async unreadOne(
    @Request() { user }: NotificationRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const res = await this.prisma.withTenantRls(user.organizationId, (tx) =>
      tx.notification.updateMany({
        where: {
          id,
          organizationId: user.organizationId,
          userId: user.id,
          readAt: { not: null },
        },
        data: { readAt: null },
      }),
    );
    if (res?.count !== 0) {
      this.emitChanged(user);
    }
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
  async updatePreferences(
    @Request() { user }: NotificationRequest,
    @Body(DtoPipe(notificationPreferencesSchema)) body: NotificationPreferences,
  ) {
    const identity = { organizationId: user.organizationId, userId: user.id };
    const updated = await this.prisma.withTenantRls(user.organizationId, (tx) =>
      tx.notificationPreference.upsert({
        where: { organizationId_userId: identity },
        create: { ...identity, ...body },
        update: body,
        select: preferencesSelect,
      }),
    );
    this.emitChanged(user);
    return updated;
  }
}
