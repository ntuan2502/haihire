"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";
import { StageBadge } from "@/components/shared/stage-badge";
import type { Application } from "@/types";
import { formatDate, getCandidateDisplayName, getInitials } from "@/lib/utils";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

interface PipelineCandidateDetailHeaderProps {
  selectedCandidate: Application;
  currentIndex: number;
  totalCandidates: number;
  onPrevCandidate: () => void;
  onNextCandidate: () => void;
  onDeleteApplication: () => void;
}

export function PipelineCandidateDetailHeader({
  selectedCandidate,
  currentIndex,
  totalCandidates,
  onPrevCandidate,
  onNextCandidate,
  onDeleteApplication,
}: PipelineCandidateDetailHeaderProps) {
  const { t } = useI18n();
  const canDeleteApplication = useHasPermission("application:delete");

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
            {getInitials(getCandidateDisplayName(selectedCandidate))}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {getCandidateDisplayName(selectedCandidate)}
              </h2>
              <StageBadge stage={selectedCandidate.stage} />
            </div>

            {/* Contact metadata row */}
            <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {selectedCandidate.candidateEmail && (
                <a
                  href={`mailto:${selectedCandidate.candidateEmail}`}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{selectedCandidate.candidateEmail}</span>
                </a>
              )}

              {selectedCandidate.candidatePhone && (
                <a
                  href={`tel:${selectedCandidate.candidatePhone}`}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{selectedCandidate.candidatePhone}</span>
                </a>
              )}

              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  {t("applications.applied")}{" "}
                  {formatDate(selectedCandidate.createdAt)}
                </span>
              </span>
            </div>

            {selectedCandidate.stage === "REJECTED" &&
              selectedCandidate.rejectionReason && (
                <p className="mt-2 rounded-lg border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-semibold">
                    {t("applications.rejectionReasonLabel")}:
                  </span>{" "}
                  {selectedCandidate.rejectionReason}
                </p>
              )}
          </div>
        </div>

        {/* Navigation arrows (1/X) and popout link */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <button
            type="button"
            onClick={onPrevCandidate}
            disabled={currentIndex <= 0}
            className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t("common.back")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <span className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {currentIndex + 1} / {totalCandidates}
          </span>

          <button
            type="button"
            onClick={onNextCandidate}
            disabled={currentIndex >= totalCandidates - 1}
            className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t("common.next")}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <Link
            href={`/dashboard/applications/${selectedCandidate.id}`}
            className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            title={t("applications.openFullPage")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {canDeleteApplication && (
            <button
              type="button"
              onClick={onDeleteApplication}
              className="h-7 w-7 rounded-lg border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1 cursor-pointer"
              title={t("common.delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
