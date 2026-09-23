"use client";

import { MessageSquare } from "lucide-react";
import { formatRelativeTime, getInitials, getCandidateDisplayName } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { Application } from "@/types";

interface PipelineCandidateCardProps {
  candidate: Application;
  isSelected: boolean;
  onSelect: () => void;
}

export function PipelineCandidateCard({
  candidate,
  isSelected,
  onSelect,
}: PipelineCandidateCardProps) {
  const { t } = useI18n();
  const displayName = getCandidateDisplayName(candidate);
  const initials = getInitials(displayName);
  const matchScore = (candidate as unknown as { matchScore?: number }).matchScore;

  return (
    <div
      id={`candidate-card-${candidate.id}`}
      onClick={onSelect}
      className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 dark:border-blue-400"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
      }`}
    >
      {/* Initials circle */}
      <div
        className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
          isSelected
            ? "bg-blue-600 text-white shadow-xs"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h4
            className={`text-xs font-bold truncate ${
              isSelected
                ? "text-blue-900 dark:text-blue-300"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {displayName}
          </h4>
          {matchScore !== undefined && matchScore !== null && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {matchScore}%
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {candidate.candidateEmail || "No email"}
        </p>

        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
          <span>{formatRelativeTime(candidate.createdAt)}</span>
          {candidate.notes && (
            <>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                <span>{t("candidates.columns.quickNotes")}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
