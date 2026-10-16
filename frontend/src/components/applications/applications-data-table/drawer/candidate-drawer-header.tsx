"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Columns3,
  ExternalLink,
  X,
  Calendar,
  Trash2,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { StageSelector } from "@/components/jobs/pipeline/stage-selector";
import { StageBadge } from "@/components/shared/stage-badge";
import { getInitials, formatDate } from "@/lib/utils";
import type { Application, ApplicationStage } from "@/types";
import { useI18n } from "@/i18n";

interface CandidateDrawerHeaderProps {
  currentApp: Application;
  onClose: () => void;
  onViewInPipeline?: (appId: string, stage: ApplicationStage) => void;
  selectedJobTitle: string;
  onStageChange: (newStage: ApplicationStage) => void;
  isStageUpdatePending: boolean;
  onOpenScheduleModal: () => void;
  onOpenDeleteModal: (app: Application) => void;
  isDeleting: boolean;
}

export function CandidateDrawerHeader({
  currentApp,
  onClose,
  onViewInPipeline,
  selectedJobTitle,
  onStageChange,
  isStageUpdatePending,
  onOpenScheduleModal,
  onOpenDeleteModal,
  isDeleting,
}: CandidateDrawerHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      {/* Drawer Top Navigation Bar */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          <span>{t("applications.backToTable")}</span>
        </button>

        <div className="flex items-center gap-2">
          {onViewInPipeline && (
            <button
              type="button"
              onClick={() => {
                onViewInPipeline(currentApp.id, currentApp.stage);
                onClose();
              }}
              className="h-8 px-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Focus candidate in Pipeline"
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>{t("applications.viewInPipeline")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/applications/${currentApp.id}`)
            }
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title={t("applications.openFullPage")}
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            <span>{t("applications.openFullPage")}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stage Action Pipeline Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <StageSelector
            currentStage={currentApp.stage}
            onSelectStage={onStageChange}
            disabled={isStageUpdatePending}
            variant="buttons"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{t("applications.scheduleInterview")}</span>
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onOpenDeleteModal(currentApp)}
            className="h-8 px-3 rounded-lg border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t("applications.deleteApplication")}</span>
          </button>
        </div>
      </div>

      {/* Candidate Header Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
          {getInitials(currentApp.candidateName)}
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {currentApp.candidateName}
            </h2>
            <StageBadge stage={currentApp.stage} />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {currentApp.candidateEmail}
            </span>
            {currentApp.candidatePhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {currentApp.candidatePhone}
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold truncate">
              <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
              {selectedJobTitle}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
            <Clock className="h-3 w-3" />
            <span>{t("applications.applied")} {formatDate(currentApp.createdAt)}</span>
          </p>
        </div>
      </div>
    </>
  );
}
