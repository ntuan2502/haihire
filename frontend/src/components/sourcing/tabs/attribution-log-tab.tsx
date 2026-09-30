"use client";

import { useI18n } from "@/i18n";
import type { AttributionLogItem, PaginatedResult } from "@haihire/shared";
import { ChannelBadge } from "../channel-badge";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AttributionLogTabProps {
  data?: PaginatedResult<AttributionLogItem>;
  isLoading?: boolean;
  page: number;
  onPageChange: (newPage: number) => void;
  search: string;
  onSearchChange: (newSearch: string) => void;
}

const STAGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  APPLIED: {
    bg: "bg-blue-50 dark:bg-blue-950/60",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/60",
  },
  SCREENING: {
    bg: "bg-purple-50 dark:bg-purple-950/60",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/60 dark:border-purple-800/60",
  },
  INTERVIEW: {
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/60",
  },
  OFFER: {
    bg: "bg-teal-50 dark:bg-teal-950/60",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/60 dark:border-teal-800/60",
  },
  HIRED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/60",
  },
  REJECTED: {
    bg: "bg-rose-50 dark:bg-rose-950/60",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200/60 dark:border-rose-800/60",
  },
};

export function AttributionLogTab({
  data,
  isLoading,
  page,
  onPageChange,
  search,
  onSearchChange,
}: AttributionLogTabProps) {
  const { t } = useI18n();

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const formatRelativeTime = (isoString: string) => {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(ms / (1000 * 60));
      if (mins < 60) return `${Math.max(1, mins)}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("sourcing.attribution.searchPlaceholder")}
            className="h-9 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {t("common.loading")}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t("sourcing.attribution.emptyTitle")}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t("sourcing.attribution.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-3 px-5">{t("sourcing.attribution.candidate")}</th>
                  <th className="py-3 px-4">{t("sourcing.attribution.job")}</th>
                  <th className="py-3 px-4">{t("sourcing.attribution.source")}</th>
                  <th className="py-3 px-4">{t("sourcing.attribution.campaign")}</th>
                  <th className="py-3 px-4 text-center">{t("sourcing.attribution.status")}</th>
                  <th className="py-3 px-5 text-right">{t("sourcing.attribution.applied")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {logs.map((log) => {
                  const initials = log.candidateName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const stageStyle =
                    STAGE_STYLES[log.stage] || STAGE_STYLES.APPLIED;
                  const stageName =
                    (t as (key: string) => string)(`pipeline.stages.${log.stage.toLowerCase()}`) ||
                    log.stage;

                  return (
                    <tr
                      key={log.applicationId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Candidate Avatar & Info */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials || "CA"}
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
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {log.jobTitle}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {log.campaign || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                        >
                          {stageName}
                        </span>
                      </td>

                      {/* Applied */}
                      <td className="py-3 px-5 text-right text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                        {formatRelativeTime(log.appliedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t("common.showing")} {logs.length} {t("common.of")} {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="h-8 w-8 p-0 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="h-8 w-8 p-0 rounded-lg cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
