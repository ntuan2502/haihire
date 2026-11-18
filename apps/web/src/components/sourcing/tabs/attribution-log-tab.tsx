"use client";

import { useI18n } from "@/i18n";
import type { AttributionLogItem, PaginatedResult } from "@haihire/shared";
import type { ApplicationStage } from "@/types";
import { ChannelBadge } from "../channel-badge";
import { StageBadge } from "@/components/shared/stage-badge";
import { Pagination } from "@/components/shared/pagination";
import {
  getCandidateDisplayName,
  getInitials,
  formatRelativeTime,
} from "@/lib/utils";
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
      <div className="rounded-xl bg-card text-card-foreground border border-border shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                {t("sourcing.attribution.emptyTitle")}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {t("sourcing.attribution.emptyDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-5">
                    {t("sourcing.attribution.candidate")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("sourcing.attribution.job")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("sourcing.attribution.source")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("sourcing.attribution.campaign")}
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    {t("sourcing.attribution.status")}
                  </th>
                  <th className="py-3.5 px-5 text-right">
                    {t("sourcing.attribution.applied")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {logs.map((log) => {
                  const displayName = getCandidateDisplayName(log);
                  const initials = getInitials(displayName);

                  return (
                    <tr
                      key={log.applicationId}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* Candidate Avatar & Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/candidates?id=${log.candidateId}`}
                              className="font-bold text-foreground hover:text-primary transition-colors truncate block"
                            >
                              {displayName}
                            </Link>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {log.candidateEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="py-3.5 px-4 text-foreground font-medium">
                        {log.jobTitle}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <ChannelBadge channel={log.source} size="sm" />
                          {log.sourceDetails && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {t("sourcing.attribution.via")}{" "}
                              {log.sourceDetails}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {log.campaign || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StageBadge stage={log.stage as ApplicationStage} />
                      </td>

                      {/* Applied */}
                      <td className="py-3.5 px-5 text-right text-muted-foreground font-mono text-[11px]">
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
    </div>
  );
}
