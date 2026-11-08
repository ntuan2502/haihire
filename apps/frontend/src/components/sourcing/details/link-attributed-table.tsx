"use client";

import { useI18n } from "@/i18n";
import type { AttributedApplicationDetailItem } from "@haihire/shared";
import { StageBadge } from "@/components/shared/stage-badge";
import { Users } from "lucide-react";
import Link from "next/link";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface LinkAttributedTableProps {
  items: AttributedApplicationDetailItem[];
}

export function LinkAttributedTable({ items }: LinkAttributedTableProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("sourcing.details.attributedTitle")}
          </h3>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t("sourcing.details.attributedShown", { count: items.length })}
        </span>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-xs font-medium text-slate-400">
            {t("sourcing.details.noCandidates")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-5">{t("sourcing.details.colCandidate")}</th>
                <th className="py-3 px-4">{t("sourcing.details.colJob")}</th>
                <th className="py-3 px-4">{t("sourcing.details.colReferrer")}</th>
                <th className="py-3 px-4">{t("sourcing.details.colCampaign")}</th>
                <th className="py-3 px-4 text-center">{t("sourcing.details.colStatus")}</th>
                <th className="py-3 px-5 text-right">{t("sourcing.details.colApplied")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {items.map((item) => {
                const initials = getInitials(item.candidateName);
                const appliedTime = formatRelativeTime(item.appliedAt);

                return (
                  <tr
                    key={item.applicationId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Candidate */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/candidates?id=${item.candidateId}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                          >
                            {item.candidateName}
                          </Link>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {item.candidateEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Job */}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {item.jobTitle}
                    </td>

                    {/* Referrer */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {item.referrer || "—"}
                    </td>

                    {/* Campaign */}
                    <td className="py-3.5 px-4">
                      {item.campaign ? (
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.campaign}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <StageBadge stage={item.stage} />
                    </td>

                    {/* Applied Date */}
                    <td className="py-3.5 px-5 text-right text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
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
