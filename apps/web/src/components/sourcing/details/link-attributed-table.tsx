"use client";

import { useI18n } from "@/i18n";
import type { AttributedApplicationDetailItem } from "@haihire/shared";
import { StageBadge } from "@/components/shared/stage-badge";
import { Users } from "lucide-react";
import Link from "next/link";
import {
  getCandidateDisplayName,
  getInitials,
  formatRelativeTime,
} from "@/lib/utils";

interface LinkAttributedTableProps {
  items: AttributedApplicationDetailItem[];
}

export function LinkAttributedTable({ items }: LinkAttributedTableProps) {
  const { t, locale } = useI18n();

  return (
    <div className="rounded-xl bg-card text-card-foreground border border-border shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {t("sourcing.details.attributedTitle")}
          </h3>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {t("sourcing.details.attributedShown", { count: items.length })}
        </span>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("sourcing.details.noCandidates")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[10px] font-bold text-muted-foreground">
                <th scope="col" className="py-3 px-5">
                  {t("sourcing.details.colCandidate")}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t("sourcing.details.colJob")}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t("sourcing.details.colReferrer")}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t("sourcing.details.colCampaign")}
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  {t("sourcing.details.colStatus")}
                </th>
                <th scope="col" className="py-3 px-5 text-right">
                  {t("sourcing.details.colApplied")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {items.map((item) => {
                const displayName = getCandidateDisplayName(item);
                const initials = getInitials(displayName);
                const appliedTime = formatRelativeTime(item.appliedAt, {
                  defaultLanguage: locale,
                });

                return (
                  <tr
                    key={item.applicationId}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* Candidate */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/candidates/${item.candidateId}`}
                            className="font-bold text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {displayName}
                          </Link>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.candidateEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Job */}
                    <td className="py-3.5 px-4 text-foreground font-medium">
                      {item.jobTitle}
                    </td>

                    {/* Referrer */}
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                      {item.referrer || "—"}
                    </td>

                    {/* Campaign */}
                    <td className="py-3.5 px-4">
                      {item.campaign ? (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {item.campaign}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <StageBadge stage={item.stage} />
                    </td>

                    {/* Applied Date */}
                    <td className="py-3.5 px-5 text-right text-muted-foreground font-medium whitespace-nowrap">
                      {appliedTime}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
