"use client";

import { useI18n } from "@/i18n";
import type { RecentAttributedCandidateItem } from "@haihire/shared";
import { ChannelBadge } from "../channel-badge";
import { Clock } from "lucide-react";
import { getCandidateDisplayName, getInitials } from "@/lib/utils";
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
    <div className="p-5 sm:p-6 rounded-xl bg-card text-card-foreground border border-border shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">
            {t("sourcing.overview.recentAttributed")}
          </h2>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            {t("common.viewAll")}
          </button>
        )}
      </div>

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          {t("sourcing.overview.noRecentCandidates")}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {candidates.map((cand) => {
            const displayName = getCandidateDisplayName(cand);
            const initials = getInitials(displayName);

            return (
              <div
                key={cand.applicationId}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/candidates/${cand.candidateId}`}
                      className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {displayName}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">
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
