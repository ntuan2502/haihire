"use client";

import { Suspense, useMemo, useState } from "react";
import { Download, Eye, History } from "lucide-react";
import { useTableParams } from "@/hooks/use-table-params";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useAuditLogsQuery,
  useOrgMembers,
} from "@/hooks/use-organization-queries";
import {
  organizationsApi,
  type OrganizationAuditLogRecord,
} from "@/lib/api/organizations";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDateTime, getUserDisplayName } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsLogTable } from "@/components/settings/settings-log-table";
import {
  LoadingSpinner,
  PageHeader,
  StatusState,
  UserAvatar,
} from "@/components/shared";
import { Pagination } from "@/components/shared/pagination";
import {
  AuditLogFilters,
  type AuditDateRangePreset,
} from "@/components/settings/audit-log/audit-log-filters";
import { AuditLogDetailDrawer } from "@/components/settings/audit-log/audit-log-detail-drawer";
import {
  formatAuditSummary,
  getAuditActionBadge,
  getAuditResourceLabel,
} from "@/components/settings/audit-log/audit-log-formatters";

const PAGE_SIZE = 20;

const DATE_PRESET_MS: Record<Exclude<AuditDateRangePreset, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function AuditLogPageContent() {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const canViewAuditLog = useHasPermission("org:view_audit_log");
  const {
    page,
    limit: pageSize,
    search,
    setSearch,
    setPage,
    setLimit: setPageSize,
    getParam,
    setParam,
    setParams,
  } = useTableParams({ defaultLimit: PAGE_SIZE });

  const selectedResource = getParam("resource", "");
  const selectedAction = getParam("action", "");
  const selectedActorId = getParam("actorId", "");
  const selectedTargetId = getParam("targetId", "");
  const rawRange = getParam("range", "all");
  const selectedDateRange: AuditDateRangePreset =
    rawRange === "24h" || rawRange === "7d" || rawRange === "30d"
      ? rawRange
      : "all";

  // Anchor cutoffs stably across renders so query keys never churn each ms
  const [anchorNow] = useState(() => Date.now());
  const fromTimestamp = useMemo(() => {
    if (selectedDateRange === "all") return undefined;
    return new Date(
      anchorNow - DATE_PRESET_MS[selectedDateRange],
    ).toISOString();
  }, [selectedDateRange, anchorNow]);

  const [inspectingLog, setInspectingLog] =
    useState<OrganizationAuditLogRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filterParams = useMemo(
    () => ({
      action: selectedAction || undefined,
      resource: selectedResource || undefined,
      actorId: selectedActorId || undefined,
      targetId: selectedTargetId || undefined,
      search: search.trim() || undefined,
      from: fromTimestamp,
    }),
    [
      selectedAction,
      selectedResource,
      selectedActorId,
      selectedTargetId,
      search,
      fromTimestamp,
    ],
  );

  const { data, isLoading, isError, error } = useAuditLogsQuery(
    canViewAuditLog
      ? {
          ...filterParams,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }
      : undefined,
    { enabled: canViewAuditLog },
  );

  const { data: members = [] } = useOrgMembers({ enabled: canViewAuditLog });

  const logs = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;

  const targetBannerLabel = useMemo(() => {
    if (!selectedTargetId) return undefined;
    const match = logs.find(
      (l) => l.targetId === selectedTargetId && Boolean(l.targetLabel),
    );
    return match?.targetLabel ?? undefined;
  }, [logs, selectedTargetId]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      setIsExporting(true);
      const blob = await organizationsApi.exportAuditLogs(filterParams, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t("settings.auditLog.exportSuccess"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t, "settings.auditLog.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  if (!canViewAuditLog) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200">
        <PageHeader
          title={t("settings.auditLog.title")}
          subtitle={t("settings.auditLog.description")}
          icon={History}
          bordered
        />
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/settings"
        />
      </div>
    );
  }

  if (isLoading && !data) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.auditLog.title")}
        subtitle={t("settings.auditLog.description")}
        icon={History}
        bordered
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SettingsButton
                type="button"
                variant="outline"
                size="sm"
                icon={Download}
                pending={isExporting}
                disabled={isExporting}
              >
                {t("settings.auditLog.exportButton")}
              </SettingsButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("csv")}>
                {t("settings.auditLog.exportCsv")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("json")}>
                {t("settings.auditLog.exportJson")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <AuditLogFilters
        searchInput={search}
        onSearchChange={setSearch}
        resource={selectedResource}
        onResourceChange={(nextRes) => {
          setParams(
            {
              resource: nextRes || null,
              ...(selectedAction ? { action: null } : {}),
            },
            true,
          );
        }}
        action={selectedAction}
        onActionChange={(nextAction) =>
          setParam("action", nextAction || null, true)
        }
        actorId={selectedActorId}
        onActorChange={(nextActor) =>
          setParam("actorId", nextActor || null, true)
        }
        dateRange={selectedDateRange}
        onDateRangeChange={(nextRange) =>
          setParam("range", nextRange === "all" ? null : nextRange, true)
        }
        targetId={selectedTargetId}
        targetLabel={targetBannerLabel}
        onClearTargetId={() => setParam("targetId", null, true)}
        onResetAll={() => {
          setSearch("");
          setParams(
            {
              resource: null,
              action: null,
              actorId: null,
              targetId: null,
              range: null,
              search: null,
            },
            true,
          );
        }}
        members={members}
      />

      {isLoading && <LoadingSpinner />}

      {isError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium text-center"
        >
          <span>{getApiErrorMessage(error, t)}</span>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {logs.length === 0 ? (
            <div className="rounded-xl border border-border bg-card text-card-foreground p-12 text-center shadow-xs space-y-2.5">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <History className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("settings.auditLog.emptyTitle")}
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {t("settings.auditLog.emptyDescription")}
              </p>
            </div>
          ) : (
            <SettingsLogTable
              footer={
                total > 0 ? (
                  <Pagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(total / pageSize))}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={(nextPage) => setPage(nextPage)}
                    onPageSizeChange={(nextSize) => setPageSize(nextSize)}
                    className="px-4 py-3 border-t border-border bg-muted/30"
                  />
                ) : undefined
              }
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-3 px-4">
                      {t("settings.auditLog.colTimestamp")}
                    </th>
                    <th scope="col" className="py-3 px-4">
                      {t("settings.auditLog.colActor")}
                    </th>
                    <th scope="col" className="py-3 px-4">
                      {t("settings.auditLog.colAction")}
                    </th>
                    <th scope="col" className="py-3 px-4">
                      {t("settings.auditLog.colSummary")}
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      {t("settings.auditLog.colMetadata")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log: OrganizationAuditLogRecord) => {
                    const badge = getAuditActionBadge(log.action, t);
                    const actorName = log.actor
                      ? getUserDisplayName(log.actor, localization)
                      : log.actorNameSnapshot || log.actorEmailSnapshot || null;
                    const actorEmail =
                      log.actor?.email || log.actorEmailSnapshot || null;

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setInspectingLog(log)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.createdAt, localization)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {actorName ? (
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                name={actorName}
                                avatarUrl={log.actor?.avatarUrl}
                                size="xs"
                                rounded="full"
                              />
                              <div className="leading-tight">
                                <div className="font-semibold text-foreground text-xs">
                                  {actorName}
                                </div>
                                {actorEmail && (
                                  <div className="text-[11px] text-muted-foreground">
                                    {actorEmail}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("settings.auditLog.systemActor")}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {getAuditResourceLabel(log.resource, t)}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-foreground max-w-md">
                          <div className="line-clamp-2 font-medium">
                            {formatAuditSummary(log, t)}
                          </div>
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SettingsButton
                            variant="ghost"
                            size="sm"
                            type="button"
                            icon={Eye}
                            onClick={() => setInspectingLog(log)}
                            aria-label={t("settings.auditLog.viewDetails")}
                          >
                            {t("settings.auditLog.viewDetails")}
                          </SettingsButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SettingsLogTable>
          )}
        </>
      )}

      <AuditLogDetailDrawer
        log={inspectingLog}
        onClose={() => setInspectingLog(null)}
        onViewEntityTimeline={(targetId) => {
          setParam("targetId", targetId, true);
        }}
      />
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuditLogPageContent />
    </Suspense>
  );
}
