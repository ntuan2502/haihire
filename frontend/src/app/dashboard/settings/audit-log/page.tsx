"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAuditLogsQuery } from "@/hooks/use-organization-queries";
import {
  History,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const { t } = useI18n();
  const canViewAuditLog = useHasPermission("org:view_audit_log");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useAuditLogsQuery(
    canViewAuditLog
      ? {
          action: selectedAction || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }
      : undefined,
  );

  const handleActionChange = (action: string) => {
    setSelectedAction(action);
    setPage(0);
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
      default:
        return {
          label: action,
          className:
            "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        };
    }
  };

  if (!canViewAuditLog) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <History className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            {t("settings.auditLog.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.auditLog.description")}
          </p>
        </div>

        <div
          role="alert"
          className="p-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 flex items-center gap-3"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="font-medium">{t("settings.auditLog.accessDenied")}</p>
        </div>
      </div>
    );
  }

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentOffset = page * PAGE_SIZE + 1;
  const currentEnd = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              {t("settings.auditLog.title")}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
              {t("settings.auditLog.badge")}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.auditLog.description")}
          </p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <select
            aria-label={t("settings.auditLog.filterAction")}
            value={selectedAction}
            onChange={(e) => handleActionChange(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("settings.auditLog.filterAllActions")}</option>
            <option value="ROLE_PERMISSIONS_UPDATED">
              {t("settings.auditLog.actionRolePermissionsUpdated")}
            </option>
            <option value="ROLE_PERMISSIONS_RESET">
              {t("settings.auditLog.actionRolePermissionsReset")}
            </option>
            <option value="MEMBER_ROLE_CHANGED">
              {t("settings.auditLog.actionMemberRoleChanged")}
            </option>
            <option value="OWNERSHIP_TRANSFERRED">
              {t("settings.auditLog.actionOwnershipTransferred")}
            </option>
            <option value="ORG_DELETED">
              {t("settings.auditLog.actionOrgDeleted")}
            </option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-md w-full animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          role="alert"
          className="p-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-center"
        >
          <p className="font-semibold">{String(error)}</p>
        </div>
      )}

      {/* Table Content */}
      {!isLoading && !isError && (
        <>
          {logs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/50">
              <History className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t("settings.auditLog.emptyTitle")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t("settings.auditLog.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {t("settings.auditLog.colTimestamp")}
                      </th>
                      <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {t("settings.auditLog.colActor")}
                      </th>
                      <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {t("settings.auditLog.colAction")}
                      </th>
                      <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {t("settings.auditLog.colResource")}
                      </th>
                      <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-right">
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

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {log.actor ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center shrink-0">
                                  {log.actor.name?.charAt(0).toUpperCase() ||
                                    "U"}
                                </div>
                                <div className="leading-tight">
                                  <div className="font-medium text-slate-900 dark:text-slate-100 text-xs">
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
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {log.resource}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {hasMetadata ? (
                              <button
                                type="button"
                                onClick={() => toggleRow(log.id)}
                                aria-label={t("settings.auditLog.colMetadata")}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Expanded Metadata Sub-view */}
              {expandedRowId && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>{t("settings.auditLog.colMetadata")}</span>
                  </div>
                  <pre className="text-xs font-mono p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto">
                    {JSON.stringify(
                      logs.find((l) => l.id === expandedRowId)?.metadata,
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}

              {/* Pagination Footer */}
              {total > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    {t("settings.auditLog.paginationShowing")
                      .replace("{offset}", String(currentOffset))
                      .replace("{end}", String(currentEnd))
                      .replace("{total}", String(total))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => {
                        setPage((prev) => Math.max(prev - 1, 0));
                        setExpandedRowId(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      {t("settings.auditLog.paginationPrev")}
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => {
                        setPage((prev) => prev + 1);
                        setExpandedRowId(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      {t("settings.auditLog.paginationNext")}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
