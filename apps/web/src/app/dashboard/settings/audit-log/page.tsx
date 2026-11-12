"use client";

import { Fragment, useState } from "react";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAuditLogsQuery } from "@/hooks/use-organization-queries";
import { History, Filter, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { getOrgRoleLabel } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";
import {
  CustomSelect,
  PageHeader,
  StatusState,
  type CustomSelectOption,
} from "@/components/shared";
import { Pagination } from "@/components/shared/pagination";

const PAGE_SIZE = 20;

const RESOURCE_KEYS = new Set([
  "ORGANIZATION",
  "MEMBER",
  "ROLE_PERMISSIONS",
  "SYSTEM",
]);

const LOCALIZATION_FIELD_MAP: Record<string, string> = {
  timezone: "settings.auditLog.metadataLabels.localizationFields.timezone",
  defaultLanguage:
    "settings.auditLog.metadataLabels.localizationFields.defaultLocale",
  defaultLocale:
    "settings.auditLog.metadataLabels.localizationFields.defaultLocale",
  defaultCurrency:
    "settings.auditLog.metadataLabels.localizationFields.defaultCurrency",
  nameDisplayOrder:
    "settings.auditLog.metadataLabels.localizationFields.nameDisplayOrder",
  dateFormat: "settings.auditLog.metadataLabels.localizationFields.dateFormat",
  timeFormat: "settings.auditLog.metadataLabels.localizationFields.timeFormat",
};

export default function AuditLogPage() {
  const { t } = useI18n();
  const canViewAuditLog = useHasPermission("org:view_audit_log");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
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
    setSelectedAction(action);
    setPage(1);
    setExpandedRowId(null);
  };

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "ROLE_PERMISSIONS_UPDATED":
        return {
          label: t("settings.auditLog.actionRolePermissionsUpdated"),
          className:
            "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "ROLE_PERMISSIONS_RESET":
        return {
          label: t("settings.auditLog.actionRolePermissionsReset"),
          className:
            "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "MEMBER_ROLE_CHANGED":
        return {
          label: t("settings.auditLog.actionMemberRoleChanged"),
          className:
            "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        };
      case "OWNERSHIP_TRANSFERRED":
        return {
          label: t("settings.auditLog.actionOwnershipTransferred"),
          className:
            "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        };
      case "ORG_DELETED":
        return {
          label: t("settings.auditLog.actionOrgDeleted"),
          className:
            "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
        };
      case "ORG_LOCALIZATION_UPDATED":
        return {
          label: t("settings.auditLog.actionOrgLocalizationUpdated"),
          className:
            "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
        };
      default:
        return {
          label: action,
          className:
            "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        };
    }
  };

  const getResourceLabel = (resource: string) => {
    const normalized = resource?.trim().toUpperCase();
    const key = RESOURCE_KEYS.has(normalized) ? normalized : "OTHER";
    return t(`settings.auditLog.resources.${key}`);
  };

  const formatAuditMetadataLines = (
    log: OrganizationAuditLogRecord,
  ): string[] => {
    const metadata = log.metadata;
    if (!metadata || typeof metadata !== "object") return [];
    const record = metadata as Record<string, unknown>;
    const lines: string[] = [];

    if (typeof record.role === "string" && record.role.trim()) {
      const roleLabel =
        record.role === "ALL"
          ? t("settings.auditLog.metadataLabels.allRoles")
          : getOrgRoleLabel(record.role, t);
      lines.push(
        t("settings.auditLog.metadataLabels.roleTarget", {
          role: roleLabel,
        }).replace("{role}", roleLabel),
      );
    }

    const permCount = Array.isArray(record.permissions)
      ? record.permissions.length
      : record.permissions && typeof record.permissions === "object"
        ? Object.keys(record.permissions).length
        : typeof record.changes === "number"
          ? record.changes
          : null;
    if (permCount !== null) {
      lines.push(
        t("settings.auditLog.metadataLabels.permissionsUpdated", {
          count: permCount,
        }).replace("{count}", String(permCount)),
      );
    }

    if (
      typeof record.oldRole === "string" &&
      typeof record.newRole === "string"
    ) {
      const oldRoleLabel = getOrgRoleLabel(record.oldRole, t);
      const newRoleLabel = getOrgRoleLabel(record.newRole, t);
      lines.push(
        t("settings.auditLog.metadataLabels.roleChanged", {
          oldRole: oldRoleLabel,
          newRole: newRoleLabel,
        })
          .replace("{oldRole}", oldRoleLabel)
          .replace("{newRole}", newRoleLabel),
      );
    }

    if (log.action === "OWNERSHIP_TRANSFERRED") {
      lines.push(t("settings.auditLog.metadataLabels.ownershipTransferred"));
    }

    if (log.action === "ORG_LOCALIZATION_UPDATED") {
      const fieldLabels = Object.keys(record)
        .filter((k) => k in LOCALIZATION_FIELD_MAP)
        .map((k) => t(LOCALIZATION_FIELD_MAP[k]));
      if (fieldLabels.length > 0) {
        const joined = fieldLabels.join(", ");
        lines.push(
          t("settings.auditLog.metadataLabels.localizationUpdated", {
            fields: joined,
          }).replace("{fields}", joined),
        );
      }
    }

    return lines;
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
      value: "OWNERSHIP_TRANSFERRED",
      label: t("settings.auditLog.actionOwnershipTransferred"),
    },
    {
      value: "ORG_DELETED",
      label: t("settings.auditLog.actionOrgDeleted"),
    },
    {
      value: "ORG_LOCALIZATION_UPDATED",
      label: t("settings.auditLog.actionOrgLocalizationUpdated"),
    },
  ];

  if (!canViewAuditLog) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200">
        <PageHeader
          title={t("settings.auditLog.title")}
          subtitle={t("settings.auditLog.description")}
          badge={t("settings.auditLog.badge")}
          icon={History}
          bordered
        />
        <StatusState
          status="403"
          variant="card"
          description={t("settings.auditLog.accessDenied")}
          actionLabel={t("settings.backToSettings")}
          actionHref="/dashboard/settings"
        />
      </div>
    );
  }

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.auditLog.title")}
        subtitle={t("settings.auditLog.description")}
        badge={t("settings.auditLog.badge")}
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

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium text-center"
        >
          <span>{String(error)}</span>
        </div>
      )}

      {/* Table Content */}
      {!isLoading && !isError && (
        <>
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs space-y-2.5">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <History className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t("settings.auditLog.emptyTitle")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {t("settings.auditLog.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/60 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-4">
                        {t("settings.auditLog.colTimestamp")}
                      </th>
                      <th className="py-3 px-4">
                        {t("settings.auditLog.colActor")}
                      </th>
                      <th className="py-3 px-4">
                        {t("settings.auditLog.colAction")}
                      </th>
                      <th className="py-3 px-4">
                        {t("settings.auditLog.colResource")}
                      </th>
                      <th className="py-3 px-4 text-right">
                        {t("settings.auditLog.colMetadata")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.map((log: OrganizationAuditLogRecord) => {
                      const badge = getActionBadge(log.action);
                      const isExpanded = expandedRowId === log.id;
                      const hasMetadata =
                        log.metadata !== null &&
                        typeof log.metadata === "object" &&
                        Object.keys(log.metadata).length > 0;
                      const summaryLines = isExpanded
                        ? formatAuditMetadataLines(log)
                        : [];

                      return (
                        <Fragment key={log.id}>
                          <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {formatDateTime(log.createdAt)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {log.actor ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center shrink-0">
                                    {log.actor.name?.charAt(0).toUpperCase() ||
                                      log.actor.email
                                        ?.charAt(0)
                                        .toUpperCase() ||
                                      "?"}
                                  </div>
                                  <div className="leading-tight">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                      {log.actor.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {log.actor.email}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">
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
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {getResourceLabel(log.resource)}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {hasMetadata ? (
                                <button
                                  type="button"
                                  onClick={() => toggleRow(log.id)}
                                  aria-label={t(
                                    "settings.auditLog.colMetadata",
                                  )}
                                  aria-expanded={isExpanded}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  <span>
                                    {t("settings.auditLog.colMetadata")}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  {t("settings.auditLog.noMetadata")}
                                </span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                              <td
                                colSpan={5}
                                className="p-4 border-t border-slate-100 dark:border-slate-800"
                              >
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>
                                    {t("settings.auditLog.colMetadata")}
                                  </span>
                                </div>
                                {summaryLines.length > 0 ? (
                                  <ul className="space-y-1 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                                    {summaryLines.map((line, index) => (
                                      <li key={`${log.id}-line-${index}`}>
                                        {line}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
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
              </div>

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
                    setPage(1);
                    setExpandedRowId(null);
                  }}
                  className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30"
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
