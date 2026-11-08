"use client";

import { useI18n } from "@/i18n";
import type { AttributionLogItem, PaginatedResult } from "@haihire/shared";
import type { ApplicationStage } from "@/types";
import { ChannelBadge } from "../channel-badge";
import { StageBadge } from "@/components/shared/stage-badge";
import { Pagination } from "@/components/shared/pagination";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { Users } from "lucide-react";
import Link from "next/link";

interface AttributionLogTabProps {
  data?: PaginatedResult<AttributionLogItem>;
  isLoading?: boolean;
  page: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

export function AttributionLogTab({
  data,
  isLoading,
  page,
  pageSize = 15,
  onPageChange,
  onPageSizeChange,
}: AttributionLogTabProps) {
  const { t } = useI18n();

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {t("common.loading")}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("sourcing.attribution.emptyTitle")}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t("sourcing.attribution.emptyDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">{t("sourcing.attribution.candidate")}</th>
                  <th className="py-3.5 px-4">{t("sourcing.attribution.job")}</th>
                  <th className="py-3.5 px-4">{t("sourcing.attribution.source")}</th>
                  <th className="py-3.5 px-4">{t("sourcing.attribution.campaign")}</th>
                  <th className="py-3.5 px-4 text-center">{t("sourcing.attribution.status")}</th>
                  <th className="py-3.5 px-5 text-right">{t("sourcing.attribution.applied")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {logs.map((log) => {
                  const initials = getInitials(log.candidateName);

                  return (
                    <tr
                      key={log.applicationId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Candidate Avatar & Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/candidates?id=${log.candidateId}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                            >
                              {log.candidateName}
                            </Link>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {log.candidateEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {log.jobTitle}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <ChannelBadge channel={log.source} size="sm" />
                          {log.sourceDetails && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {t("sourcing.attribution.via")} {log.sourceDetails}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {log.campaign || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StageBadge stage={log.stage as ApplicationStage} />
                      </td>

                      {/* Applied */}
                      <td className="py-3.5 px-5 text-right text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                        {formatRelativeTime(log.appliedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination */}
        {total > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
