"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsLogTable } from "@/components/settings/settings-log-table";
import { Fragment, Suspense, useState } from "react";
import { useTableParams } from "@/hooks/use-table-params";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAuditLogsQuery } from "@/hooks/use-organization-queries";
import { History, Filter, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDateTime, getInitials, getUserDisplayName } from "@/lib/utils";
import {
  formatAuditMetadataLines,
  getAuditActionBadge,
  getAuditResourceLabel,
} from "@/components/settings/audit-log/audit-log-formatters";
import {
  CustomSelect,
  LoadingSpinner,
  PageHeader,
  StatusState,
  type CustomSelectOption,
} from "@/components/shared";
import { Pagination } from "@/components/shared/pagination";

const PAGE_SIZE = 20;

function AuditLogPageContent() {
  const { t } = useI18n();
  const canViewAuditLog = useHasPermission("org:view_audit_log");
  const {
    page,
    limit: pageSize,
    setPage,
    setLimit: setPageSize,
    getParam,
    setParam,
  } = useTableParams({ defaultLimit: PAGE_SIZE });
  const selectedAction = getParam("action", "");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useAuditLogsQuery(
    canViewAuditLog
      ? {
          action: selectedAction || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }
      : undefined,
    { enabled: canViewAuditLog },
  );

  const handleActionChange = (action: string) => {
    setParam("action", action || null, true);
    setExpandedRowId(null);
  };

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const actionOptions: CustomSelectOption<string>[] = [
    { value: "", label: t("settings.auditLog.filterAllActions") },
    {
      value: "ROLE_PERMISSIONS_UPDATED",
      label: t("settings.auditLog.actionRolePermissionsUpdated"),
    },
    {
      value: "ROLE_PERMISSIONS_RESET",
      label: t("settings.auditLog.actionRolePermissionsReset"),
    },
    {
      value: "MEMBER_ROLE_CHANGED",
      label: t("settings.auditLog.actionMemberRoleChanged"),
    },
    {
      value: "MEMBER_REMOVED",
      label: t("settings.auditLog.actionMemberRemoved"),
    },
    {
      value: "OWNERSHIP_TRANSFERRED",
      label: t("settings.auditLog.actionOwnershipTransferred"),
    },
    {
      value: "ORG_LOCALIZATION_UPDATED",
      label: t("settings.auditLog.actionOrgLocalizationUpdated"),
    },
    {
      value: "ORG_LOGO_UPDATED",
      label: t("settings.auditLog.actionOrgLogoUpdated"),
    },
    {
      value: "ORG_LOGO_REMOVED",
      label: t("settings.auditLog.actionOrgLogoRemoved"),
    },
  ];

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

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;

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
          <CustomSelect
            size="sm"
            aria-label={t("settings.auditLog.filterAction")}
            icon={Filter}
            value={selectedAction}
            onChange={handleActionChange}
            options={actionOptions}
            className="w-full sm:w-64"
          />
        }
      />

      {/* Loading */}
      {isLoading && <LoadingSpinner />}

      {/* Error State */}
      {isError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium text-center"
        >
          <span>{getApiErrorMessage(error, t)}</span>
        </div>
      )}

      {/* Table Content */}
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
                <>
                  {/* Shared Pagination Footer */}
                  {total > 0 && (
                    <Pagination
                      currentPage={page}
                      totalPages={Math.max(1, Math.ceil(total / pageSize))}
                      totalItems={total}
                      pageSize={pageSize}
                      onPageChange={(nextPage) => {
                        setPage(nextPage);
                        setExpandedRowId(null);
                      }}
                      onPageSizeChange={(nextSize) => {
                        setPageSize(nextSize);
                        setExpandedRowId(null);
                      }}
                      className="px-4 py-3 border-t border-border bg-muted/30"
                    />
                  )}
                </>
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
                      {t("settings.auditLog.colResource")}
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      {t("settings.auditLog.colMetadata")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log: OrganizationAuditLogRecord) => {
                    const badge = getAuditActionBadge(log.action, t);
                    const isExpanded = expandedRowId === log.id;
                    const hasMetadata =
                      log.metadata !== null &&
                      typeof log.metadata === "object" &&
                      Object.keys(log.metadata).length > 0;
                    const summaryLines = isExpanded
                      ? formatAuditMetadataLines(log, t)
                      : [];

                    return (
                      <Fragment key={log.id}>
                        <tr className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {log.actor ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground font-semibold text-xs flex items-center justify-center shrink-0">
                                  {getInitials(getUserDisplayName(log.actor))}
                                </div>
                                <div className="leading-tight">
                                  <div className="font-semibold text-foreground text-xs">
                                    {getUserDisplayName(log.actor)}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {log.actor.email}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {t("settings.auditLog.systemActor")}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-foreground whitespace-nowrap">
                            {getAuditResourceLabel(log.resource, t)}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {hasMetadata ? (
                              <SettingsButton
                                variant="ghost"
                                type="button"
                                onClick={() => toggleRow(log.id)}
                                aria-label={t("settings.auditLog.colMetadata")}
                                aria-expanded={isExpanded}
                              >
                                <span>
                                  {t("settings.auditLog.colMetadata")}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </SettingsButton>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {t("settings.auditLog.noMetadata")}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td
                              colSpan={5}
                              className="p-4 border-t border-border"
                            >
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                                <Info
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
                                <span>
                                  {t("settings.auditLog.colMetadata")}
                                </span>
                              </div>
                              {summaryLines.length > 0 ? (
                                <ul className="space-y-1 p-3 rounded-lg bg-card border border-border text-xs text-foreground list-disc list-inside">
                                  {summaryLines.map((line, index) => (
                                    <li key={`${log.id}-line-${index}`}>
                                      {line}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground p-3 rounded-lg bg-card border border-border">
                                  {t("settings.auditLog.noMetadata")}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </SettingsLogTable>
          )}
        </>
      )}
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
