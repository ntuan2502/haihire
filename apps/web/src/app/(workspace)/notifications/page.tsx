"use client";

import { Suspense, useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCheck,
  Filter,
  RotateCcw,
  Settings,
} from "lucide-react";
import { cn } from "cn";
import {
  notificationStatusFilters,
  type NotificationKind,
  type NotificationKindFilter,
  type NotificationStatusFilter,
  type WebsiteNotification,
} from "@haihire/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import { CustomSelect, PageHeader } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Pagination } from "@/components/shared/pagination";
import { useLocalization } from "@/components/providers/localization-provider";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationUnreadMutation,
  useNotificationsQuery,
} from "@/hooks/use-notification-queries";
import { useI18n } from "@/i18n";
import { resolveEffectiveTimezone } from "@/lib/utils";
import {
  getNotificationHref,
  groupNotificationsByDate,
  type NotificationDateGroupKey,
} from "@/components/notifications/notification-utils";
import { NotificationRow } from "@/components/notifications/notification-row";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const ALLOWED_LIMITS = [10, 20, 50] as const;

const GROUP_TITLE_KEYS: Record<NotificationDateGroupKey, string> = {
  today: "notificationInbox.groupToday",
  yesterday: "notificationInbox.groupYesterday",
  earlier: "notificationInbox.groupEarlier",
};

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

function NotificationsPageContent() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { localization, isConfigured } = useLocalization();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canViewApplications = useHasPermission("application:view");
  const canViewInterviews = useHasPermission("interview:view");

  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );
  const locOverrides = isConfigured ? localization : undefined;
  const relOverrides = locOverrides
    ? {
        ...locOverrides,
        defaultLanguage: locale ?? locOverrides.defaultLanguage,
      }
    : locale
      ? { defaultLanguage: locale }
      : undefined;

  const allowedKindList = useMemo<NotificationKind[]>(() => {
    const kinds: NotificationKind[] = [];
    if (canViewApplications) kinds.push("applicationReceived");
    if (canViewInterviews) {
      kinds.push(
        "interviewScheduled",
        "interviewChanged",
        "interviewCancelled",
      );
    }
    return kinds;
  }, [canViewApplications, canViewInterviews]);

  const rawStatus = searchParams.get("status");
  const status: NotificationStatusFilter = notificationStatusFilters.includes(
    rawStatus as NotificationStatusFilter,
  )
    ? (rawStatus as NotificationStatusFilter)
    : "all";

  const rawKind = searchParams.get("kind");
  const kind: NotificationKindFilter =
    rawKind && allowedKindList.includes(rawKind as NotificationKind)
      ? (rawKind as NotificationKindFilter)
      : "all";

  const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const parsedLimit = parsePositiveInt(
    searchParams.get("limit"),
    DEFAULT_LIMIT,
  );
  const limit = ALLOWED_LIMITS.includes(
    parsedLimit as (typeof ALLOWED_LIMITS)[number],
  )
    ? parsedLimit
    : DEFAULT_LIMIT;

  const organizationId = user?.organizationId ?? user?.organization?.id;
  const userId = user?.id;

  const updateQuery = useCallback(
    (patch: {
      status?: NotificationStatusFilter;
      kind?: NotificationKindFilter;
      page?: number;
      limit?: number;
    }) => {
      const nextStatus = patch.status ?? status;
      const nextKind = patch.kind ?? kind;
      const nextPage = patch.page ?? page;
      const nextLimit = patch.limit ?? limit;

      const params = new URLSearchParams();
      if (nextStatus !== "all") params.set("status", nextStatus);
      if (nextKind !== "all") params.set("kind", nextKind);
      if (nextPage > DEFAULT_PAGE) params.set("page", String(nextPage));
      if (nextLimit !== DEFAULT_LIMIT) params.set("limit", String(nextLimit));

      const qs = params.toString();
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (targetUrl === currentUrl) return;
      router.replace(targetUrl, { scroll: false });
    },
    [kind, limit, page, pathname, router, searchParams, status],
  );

  const inbox = useNotificationsQuery(organizationId, userId, {
    page,
    limit,
    status,
    kind,
  });

  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const markUnread = useMarkNotificationUnreadMutation();

  const items = useMemo(() => inbox.data?.items ?? [], [inbox.data?.items]);
  const unreadCount = inbox.data?.unreadCount ?? 0;
  const total = inbox.data?.total ?? items.length;
  const totalPages =
    inbox.data?.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 0);

  useEffect(() => {
    if (
      !inbox.isLoading &&
      !inbox.isError &&
      totalPages > 0 &&
      page > totalPages
    ) {
      updateQuery({ page: totalPages });
    }
  }, [inbox.isError, inbox.isLoading, page, totalPages, updateQuery]);

  const groupedItems = useMemo(
    () => groupNotificationsByDate(items, effectiveTimezone),
    [items, effectiveTimezone],
  );

  const kindOptions = useMemo(
    () => [
      { value: "all", label: t("notificationInbox.filterKindAll") },
      ...allowedKindList.map((k) => ({
        value: k,
        label: t(`notificationInbox.${k}`),
      })),
    ],
    [allowedKindList, t],
  );

  const isMutating =
    markRead.isPending || markAllRead.isPending || markUnread.isPending;
  const hasActiveFilters = status !== "all" || kind !== "all";

  const handleOpenNotification = (item: WebsiteNotification) => {
    const href = getNotificationHref(item, {
      canViewApplications,
      canViewInterviews,
    });
    if (!item.readAt) {
      markRead.mutate(item.id);
    }
    if (href) {
      router.push(href);
    }
  };

  const handleToggleRead = (item: WebsiteNotification) => {
    if (item.readAt) {
      markUnread.mutate(item.id);
    } else {
      markRead.mutate(item.id);
    }
  };

  const organizationName = user?.organization?.name;

  if (inbox.isLoading && !inbox.data) {
    return <LoadingSpinner />;
  }

  return (
    <div
      data-testid="notifications-shell"
      className="flex flex-1 flex-col bg-background"
    >
      <section
        data-testid="notifications-content"
        className="w-full flex-1 min-w-0 p-4 sm:p-6 space-y-6 animate-in fade-in duration-200"
      >
        <PageHeader
          title={t("settings.notifications")}
          subtitle={
            organizationName
              ? t("notificationInbox.pageSubtitleWorkspace", {
                  workspace: organizationName,
                })
              : t("notificationInbox.pageSubtitle")
          }
          icon={Bell}
          badge={unreadCount > 0 ? unreadCount : undefined}
          bordered
          actions={
            <>
              <SettingsButton
                type="button"
                variant="outline"
                size="sm"
                icon={CheckCheck}
                pending={markAllRead.isPending}
                disabled={unreadCount === 0 || isMutating}
                onClick={() => markAllRead.mutate()}
              >
                {t("notificationInbox.readAll")}
              </SettingsButton>
              <SettingsButton
                type="button"
                variant="outline"
                size="sm"
                icon={Settings}
                onClick={() => router.push("/account#notifications")}
              >
                {t("notificationInbox.settings")}
              </SettingsButton>
            </>
          }
        />

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {notificationStatusFilters.map((filterValue) => {
              const isSelected = status === filterValue;
              return (
                <button
                  key={filterValue}
                  type="button"
                  onClick={() => updateQuery({ status: filterValue, page: 1 })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span>{t(`notificationInbox.${filterValue}`)}</span>
                  {filterValue === "unread" && unreadCount > 0 && (
                    <span className="text-[11px] opacity-85 tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {allowedKindList.length > 0 && (
              <CustomSelect
                size="sm"
                icon={Filter}
                aria-label={t("notificationInbox.filterKindAll")}
                value={kind}
                onChange={(nextKind) =>
                  updateQuery({
                    kind: nextKind as NotificationKindFilter,
                    page: 1,
                  })
                }
                options={kindOptions}
                className="w-full sm:w-60"
                triggerClassName="h-9 text-xs w-full"
              />
            )}

            {hasActiveFilters && (
              <SettingsButton
                type="button"
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() =>
                  updateQuery({ status: "all", kind: "all", page: 1 })
                }
              >
                {t("notificationInbox.clearFilters")}
              </SettingsButton>
            )}
          </div>
        </div>

        {/* Notifications List Card */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
          {inbox.isLoading && <LoadingSpinner />}

          {inbox.isError && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <BellOff className="size-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("notificationInbox.loadError")}
              </p>
              <SettingsButton
                type="button"
                variant="outline"
                size="sm"
                icon={RotateCcw}
                onClick={() => void inbox.refetch()}
              >
                {t("notificationInbox.retry")}
              </SettingsButton>
            </div>
          )}

          {!inbox.isLoading && !inbox.isError && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
              {status === "unread" && kind === "all" && unreadCount === 0 ? (
                <>
                  <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCheck className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("notificationInbox.emptyUnread")}
                  </p>
                </>
              ) : hasActiveFilters ? (
                <>
                  <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <BellOff className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("notificationInbox.emptyFiltered")}
                  </p>
                  <SettingsButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() =>
                      updateQuery({ status: "all", kind: "all", page: 1 })
                    }
                    className="mt-2"
                  >
                    {t("notificationInbox.clearFilters")}
                  </SettingsButton>
                </>
              ) : (
                <>
                  <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <BellOff className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("notificationInbox.empty")}
                  </p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    {t("notificationInbox.emptyHint")}
                  </p>
                </>
              )}
            </div>
          )}

          {!inbox.isLoading && !inbox.isError && groupedItems.length > 0 && (
            <div className="divide-y divide-border">
              {groupedItems.map((group) => (
                <section
                  key={group.key}
                  aria-label={t(GROUP_TITLE_KEYS[group.key])}
                >
                  <div className="border-b border-border/70 bg-muted/40 px-4 py-2 text-[11px] font-semibold text-muted-foreground">
                    {t(GROUP_TITLE_KEYS[group.key])}
                  </div>
                  <div className="divide-y divide-border/60">
                    {group.items.map((item) => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        href={getNotificationHref(item, {
                          canViewApplications,
                          canViewInterviews,
                        })}
                        locOverrides={locOverrides}
                        relOverrides={relOverrides}
                        isMutating={isMutating}
                        onOpen={handleOpenNotification}
                        onToggleRead={handleToggleRead}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {!inbox.isLoading && !inbox.isError && total > 0 && (
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, totalPages)}
            totalItems={total}
            pageSize={limit}
            pageSizeOptions={[...ALLOWED_LIMITS]}
            onPageChange={(nextPage) => updateQuery({ page: nextPage })}
            onPageSizeChange={(nextLimit) =>
              updateQuery({ limit: nextLimit, page: 1 })
            }
            itemLabel={t("notificationInbox.itemLabel")}
          />
        )}
      </section>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
