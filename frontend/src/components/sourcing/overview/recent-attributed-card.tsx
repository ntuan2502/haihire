"use client";

import { useI18n } from "@/i18n";
import type { RecentAttributedCandidateItem } from "@haihire/shared";
import { ChannelBadge } from "../channel-badge";
import { Users, Clock } from "lucide-react";
import Link from "next/link";

interface RecentAttributedCardProps {
  candidates: RecentAttributedCandidateItem[];
  onViewAll?: () => void;
}

export function RecentAttributedCard({
  candidates,
  onViewAll,
}: RecentAttributedCardProps) {
  const { t } = useI18n();

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("sourcing.overview.recentAttributed")}
          </h2>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
          >
            {t("common.viewAll")}
          </button>
        )}
      </div>

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          {t("sourcing.overview.noRecentCandidates")}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {candidates.map((cand) => {
            const initials = cand.candidateName
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={cand.applicationId}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {initials || "CA"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/candidates?id=${cand.candidateId}`}
                      className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                    >
                      {cand.candidateName}
                    </Link>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {cand.jobTitle}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <ChannelBadge channel={cand.source} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
