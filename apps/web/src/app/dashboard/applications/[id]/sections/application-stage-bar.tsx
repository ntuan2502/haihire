import { Calendar, Trash2 } from "lucide-react";
import { StageSelector } from "@/components/jobs/pipeline/stage-selector";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import type { Application, ApplicationStage } from "@/types";

interface ApplicationStageBarProps {
  app: Application | null | undefined;
  isUpdatingStage: boolean;
  isDeleting: boolean;
  onSelectStage: (stage: ApplicationStage) => void;
  onOpenScheduleModal?: () => void;
  onOpenDeleteModal: () => void;
}

export function ApplicationStageBar({
  app,
  isUpdatingStage,
  isDeleting,
  onSelectStage,
  onOpenScheduleModal,
  onOpenDeleteModal,
}: ApplicationStageBarProps) {
  const { t } = useI18n();
  const canUpdateStage = useHasPermission("application:update_stage");
  const canCreateInterview = useHasPermission("interview:create");
  const canDeleteApplication = useHasPermission("application:delete");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      {/* Left Stage Action Buttons with State Machine Prevention */}
      <div className="flex items-center gap-2 flex-wrap">
        {app && (
          <StageSelector
            currentStage={app.stage}
            onSelectStage={onSelectStage}
            disabled={!canUpdateStage || isUpdatingStage}
            variant="buttons"
          />
        )}
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        {canCreateInterview && onOpenScheduleModal && (
          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="h-8 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title={t("applications.scheduleInterview")}
          >
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span>{t("applications.scheduleInterview")}</span>
          </button>
        )}

        {canDeleteApplication && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={onOpenDeleteModal}
            className="h-8 px-3 rounded-xl border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t("applications.deleteApplication")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
