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
import { ConfirmDestructiveModal } from "@/components/shared";
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
  onToggleStatus?: (id: string, currentActive: boolean) => void;
  onDeleteLink?: (id: string) => void;
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
  const [linkToDelete, setLinkToDelete] = useState<TrackingLinkItem | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const buildCareerPath = (link: TrackingLinkItem) => {
    const titleSlug = link.jobTitle ? slugify(link.jobTitle) : "";
    const jobSlug =
      titleSlug && link.jobId
        ? `${titleSlug}-${link.jobId.slice(0, 8)}`
        : titleSlug || link.jobId || "";
    const jobSegment = jobSlug ? `/${jobSlug}` : "";
    const params = new URLSearchParams({ ref: link.token });
    if (link.utmSource) params.set("utm_source", link.utmSource);
    if (link.utmMedium) params.set("utm_medium", link.utmMedium);
    if (link.utmCampaign) params.set("utm_campaign", link.utmCampaign);
    if (link.utmTerm) params.set("utm_term", link.utmTerm);
    if (link.utmContent) params.set("utm_content", link.utmContent);
    return `/careers/${orgSlug}${jobSegment}?${params.toString()}`;
  };

  const handleCopyLink = (link: TrackingLinkItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${buildCareerPath(link)}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const links = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="rounded-xl bg-card text-card-foreground border border-border shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Link2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                {t("sourcing.links.emptyTitle")}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {t("sourcing.links.emptyDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-5">{t("sourcing.links.name")}</th>
                  <th className="py-3.5 px-4">{t("sourcing.links.source")}</th>
                  <th className="py-3.5 px-4">{t("sourcing.links.job")}</th>
                  <th className="py-3.5 px-4 text-center">
                    {t("sourcing.links.clicks")}
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    {t("sourcing.links.apps")}
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    {t("sourcing.links.cvr")}
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    {t("sourcing.links.status")}
                  </th>
                  <th className="py-3.5 px-5 text-right">
                    {t("sourcing.links.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {links.map((link) => {
                  const isCopied = copiedId === link.id;

                  return (
                    <tr
                      key={link.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* Name & Token */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-0.5">
                          <Link
                            href={`/source-tracking/${link.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors inline-block"
                          >
                            {link.name}
                          </Link>
                          <p className="text-[11px] font-mono text-muted-foreground">
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
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {link.jobTitle || t("sourcing.modal.allJobsOption")}
                      </td>

                      {/* Clicks */}
                      <td className="py-3.5 px-4 text-center font-bold text-foreground">
                        {link.clicksCount}
                      </td>

                      {/* Applications */}
                      <td className="py-3.5 px-4 text-center font-bold text-foreground">
                        {link.applicationsCount}
                      </td>

                      {/* CVR */}
                      <td className="py-3.5 px-4 text-center font-bold text-primary">
                        {link.conversionRate}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {onToggleStatus ? (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleStatus(link.id, link.isActive)
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                              link.isActive
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80"
                                : "bg-secondary text-muted-foreground border-border"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                link.isActive
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground"
                              }`}
                            />
                            <span>
                              {link.isActive
                                ? t("sourcing.links.active")
                                : t("sourcing.links.inactive")}
                            </span>
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              link.isActive
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80"
                                : "bg-secondary text-muted-foreground border-border"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                link.isActive
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground"
                              }`}
                            />
                            <span>
                              {link.isActive
                                ? t("sourcing.links.active")
                                : t("sourcing.links.inactive")}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy URL Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(link)}
                            className="h-8 px-2.5 rounded-md text-muted-foreground hover:text-primary gap-1 text-[11px] font-semibold cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-600">
                                  {t("sourcing.links.linkCopied")}
                                </span>
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
                            href={buildCareerPath(link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
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
                              className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                              title={t("common.edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Toggle Power */}
                          {onToggleStatus && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                onToggleStatus(link.id, link.isActive)
                              }
                              className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                              title={t("sourcing.links.toggleStatus")}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Delete Link */}
                          {onDeleteLink && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setLinkToDelete(link);
                                setIsDeleteModalOpen(true);
                              }}
                              aria-label={t("common.delete")}
                              title={t("common.delete")}
                              className="h-8 w-8 p-0 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
          <div className="border-t border-border p-4">
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

      <ConfirmDestructiveModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!linkToDelete || !onDeleteLink) return;
          await onDeleteLink(linkToDelete.id);
          setIsDeleteModalOpen(false);
        }}
        title={t("common.delete")}
        description={t("sourcing.links.deleteConfirm")}
        notice={
          linkToDelete ? (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-semibold text-foreground break-words">
                {linkToDelete.name}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground break-all">
                {linkToDelete.token}
              </span>
            </div>
          ) : undefined
        }
        confirmButtonLabel={t("common.delete")}
        cancelButtonLabel={t("common.cancel")}
        variant="danger"
      />
    </div>
  );
}
