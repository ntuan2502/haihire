"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import type { TrackingLinkItem, PaginatedResult } from "@haihire/shared";
import { ChannelBadge } from "../channel-badge";
import {
  Copy,
  Check,
  Search,
  Power,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrackingLinksTabProps {
  data?: PaginatedResult<TrackingLinkItem>;
  isLoading?: boolean;
  page: number;
  onPageChange: (newPage: number) => void;
  search: string;
  onSearchChange: (newSearch: string) => void;
  orgSlug: string;
  onToggleStatus: (id: string, currentActive: boolean) => void;
  onDeleteLink: (id: string) => void;
}

export function TrackingLinksTab({
  data,
  isLoading,
  page,
  onPageChange,
  search,
  onSearchChange,
  orgSlug,
  onToggleStatus,
  onDeleteLink,
}: TrackingLinksTabProps) {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (token: string, id: string, jobId?: string | null) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const jobSegment = jobId ? `/${jobId}` : "";
    const url = `${origin}/careers/${orgSlug}${jobSegment}?ref=${token}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const links = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("sourcing.links.searchPlaceholder")}
            className="h-9 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {t("common.loading")}
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t("sourcing.links.emptyTitle")}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t("sourcing.links.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-3 px-5">{t("sourcing.links.name")}</th>
                  <th className="py-3 px-4">{t("sourcing.links.source")}</th>
                  <th className="py-3 px-4">{t("sourcing.links.job")}</th>
                  <th className="py-3 px-4 text-center">{t("sourcing.links.clicks")}</th>
                  <th className="py-3 px-4 text-center">{t("sourcing.links.apps")}</th>
                  <th className="py-3 px-4 text-center">{t("sourcing.links.cvr")}</th>
                  <th className="py-3 px-4 text-center">{t("sourcing.links.status")}</th>
                  <th className="py-3 px-5 text-right">{t("sourcing.links.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {links.map((link) => {
                  const isCopied = copiedId === link.id;

                  return (
                    <tr
                      key={link.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Name & Token */}
                      <td className="py-3 px-5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {link.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            ?ref={link.token}
                          </p>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        <ChannelBadge
                          channel={link.source}
                          customLabel={link.customSource}
                          size="sm"
                        />
                      </td>

                      {/* Job */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {link.jobTitle || t("sourcing.modal.allJobsOption")}
                      </td>

                      {/* Clicks */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                        {link.clicksCount}
                      </td>

                      {/* Apps */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                        {link.applicationsCount}
                      </td>

                      {/* CVR */}
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {link.conversionRate}%
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            link.isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              link.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>
                            {link.isActive
                              ? t("sourcing.links.active")
                              : t("sourcing.links.inactive")}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* Copy Link Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(link.token, link.id, link.jobId)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                            title={t("sourcing.links.copyLink")}
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Toggle Active Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onToggleStatus(link.id, link.isActive)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                            title={t("sourcing.links.toggleStatus")}
                          >
                            <Power className={`h-3.5 w-3.5 ${link.isActive ? "text-emerald-600" : "text-slate-400"}`} />
                          </Button>

                          {/* Delete Link Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm(t("sourcing.links.deleteConfirm"))) {
                                onDeleteLink(link.id);
                              }
                            }}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
              {t("common.showing")} {links.length} {t("common.of")} {total}
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
