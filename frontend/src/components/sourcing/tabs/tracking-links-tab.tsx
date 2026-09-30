"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import type { TrackingLinkItem, PaginatedResult } from "@haihire/shared";
import { ChannelBadge } from "../channel-badge";
import {
  Copy,
  Check,
  Power,
  Trash2,
  ExternalLink,
  Link2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import Link from "next/link";
import { slugify } from "@/lib/utils";

interface TrackingLinksTabProps {
  data?: PaginatedResult<TrackingLinkItem>;
  isLoading?: boolean;
  page: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  orgSlug: string;
  onToggleStatus: (id: string, currentActive: boolean) => void;
  onDeleteLink: (id: string) => void;
  onEditLink?: (link: TrackingLinkItem) => void;
}

export function TrackingLinksTab({
  data,
  isLoading,
  page,
  pageSize = 15,
  onPageChange,
  onPageSizeChange,
  orgSlug,
  onToggleStatus,
  onDeleteLink,
  onEditLink,
}: TrackingLinksTabProps) {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (
    token: string,
    id: string,
    jobId?: string | null,
    jobTitle?: string | null,
  ) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const jobSlug = jobTitle ? slugify(jobTitle) : jobId || "";
    const jobSegment = jobSlug ? `/${jobSlug}` : "";
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
      {/* Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {t("common.loading")}
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Link2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("sourcing.links.emptyTitle")}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t("sourcing.links.emptyDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">{t("sourcing.links.name")}</th>
                  <th className="py-3.5 px-4">{t("sourcing.links.source")}</th>
                  <th className="py-3.5 px-4">{t("sourcing.links.job")}</th>
                  <th className="py-3.5 px-4 text-center">{t("sourcing.links.clicks")}</th>
                  <th className="py-3.5 px-4 text-center">{t("sourcing.links.apps")}</th>
                  <th className="py-3.5 px-4 text-center">{t("sourcing.links.cvr")}</th>
                  <th className="py-3.5 px-4 text-center">{t("sourcing.links.status")}</th>
                  <th className="py-3.5 px-5 text-right">{t("sourcing.links.actions")}</th>
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
                      <td className="py-3.5 px-5">
                        <div className="space-y-0.5">
                          <Link
                            href={`/dashboard/source-tracking/${link.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-block"
                          >
                            {link.name}
                          </Link>
                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            ?ref={link.token}
                          </p>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <ChannelBadge
                          channel={link.source}
                          customLabel={link.customSource}
                          size="sm"
                        />
                      </td>

                      {/* Job */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {link.jobTitle || t("sourcing.modal.allJobsOption")}
                      </td>

                      {/* Clicks */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {link.clicksCount}
                      </td>

                      {/* Applications */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {link.applicationsCount}
                      </td>

                      {/* CVR */}
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {link.conversionRate}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(link.id, link.isActive)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            link.isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
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
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy URL Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(link.token, link.id, link.jobId, link.jobTitle)}
                            className="h-8 px-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 gap-1 text-[11px] font-semibold cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-600">{t("sourcing.links.linkCopied")}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>{t("sourcing.links.copyLink")}</span>
                              </>
                            )}
                          </Button>

                          {/* Open Career Link */}
                          <a
                            href={`/careers/${orgSlug}${link.jobTitle ? `/${slugify(link.jobTitle)}` : link.jobId ? `/${link.jobId}` : ""}?ref=${link.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title={t("sourcing.modal.previewLabel")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          {/* Edit Link Button */}
                          {onEditLink && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEditLink(link)}
                              className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                              title={t("common.edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Toggle Power */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onToggleStatus(link.id, link.isActive)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            title={t("sourcing.links.toggleStatus")}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete Link */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(t("sourcing.links.deleteConfirm"))) {
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
