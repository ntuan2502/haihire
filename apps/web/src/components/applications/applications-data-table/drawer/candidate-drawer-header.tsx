"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Columns3,
  ExternalLink,
  X,
  Trash2,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { StageSelector } from "@/components/jobs/pipeline/stage-selector";
import { StageBadge } from "@/components/shared/stage-badge";
import { getCandidateDisplayName, getInitials, formatDate } from "@/lib/utils";
import type { Application, ApplicationStage } from "@/types";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

export interface CandidateDrawerHeaderProps {
  currentApp: Application;
  onClose: () => void;
  onViewInPipeline?: (appId: string, stage: ApplicationStage) => void;
}

export interface CandidateDrawerSummaryProps {
  currentApp: Application;
  selectedJobTitle: string;
  onStageChange: (newStage: ApplicationStage) => void;
  isStageUpdatePending: boolean;
  onOpenDeleteModal: (app: Application) => void;
  isDeleting: boolean;
}

export function CandidateDrawerHeader({
  currentApp,
  onClose,
  onViewInPipeline,
}: CandidateDrawerHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowRight className="h-3.5 w-3.5 rotate-180" />
        <span>{t("applications.backToTable")}</span>
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        {onViewInPipeline && (
          <button
            type="button"
            onClick={() => {
              onViewInPipeline(currentApp.id, currentApp.stage);
              onClose();
            }}
            className="h-8 px-2.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title={t("pipeline.focusCandidate")}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>{t("applications.viewInPipeline")}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push(`/applications/${currentApp.id}`)}
          className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title={t("applications.openFullPage")}
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("applications.openFullPage")}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function CandidateDrawerSummary({
  currentApp,
  selectedJobTitle,
  onStageChange,
  isStageUpdatePending,
  onOpenDeleteModal,
  isDeleting,
}: CandidateDrawerSummaryProps) {
  const { t } = useI18n();
  const canUpdateStage = useHasPermission("application:update_stage");
  const canDeleteApplication = useHasPermission("application:delete");

  return (
    <div className="space-y-4">
      {/* Stage Action Pipeline Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <StageSelector
            currentStage={currentApp.stage}
            onSelectStage={onStageChange}
            disabled={!canUpdateStage || isStageUpdatePending}
            variant="buttons"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canDeleteApplication && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onOpenDeleteModal(currentApp)}
              className="h-8 px-3 rounded-md border border-destructive/30 bg-background text-xs font-semibold text-destructive hover:bg-destructive/10 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("applications.deleteApplication")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Candidate Header Card */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-sm shrink-0">
          {getInitials(getCandidateDisplayName(currentApp))}
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-foreground truncate">
              {getCandidateDisplayName(currentApp)}
            </h2>
            <StageBadge stage={currentApp.stage} />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {currentApp.candidateEmail}
            </span>
            {currentApp.candidatePhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {currentApp.candidatePhone}
              </span>
            )}
            <span className="flex items-center gap-1 text-foreground font-semibold truncate">
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              {selectedJobTitle}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
            <Clock className="h-3 w-3" />
            <span>
              {t("applications.applied")} {formatDate(currentApp.createdAt)}
            </span>
          </p>
          {currentApp.stage === "REJECTED" && currentApp.rejectionReason && (
            <div className="mt-2 rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-300">
              <span className="font-medium">
                {t("applications.rejectionReasonLabel")}:{" "}
              </span>
              <span>{currentApp.rejectionReason}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
