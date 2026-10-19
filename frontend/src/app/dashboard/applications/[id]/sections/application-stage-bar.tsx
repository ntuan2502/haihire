import { Calendar, Trash2 } from "lucide-react";
import { StageSelector } from "@/components/jobs/pipeline/stage-selector";
import { useI18n } from "@/i18n";
import type { Application, ApplicationStage } from "@/types";

interface ApplicationStageBarProps {
  app: Application | null | undefined;
  isUpdatingStage: boolean;
  isDeleting: boolean;
  onSelectStage: (stage: ApplicationStage) => void;
  onOpenDeleteModal: () => void;
}

export function ApplicationStageBar({
  app,
  isUpdatingStage,
  isDeleting,
  onSelectStage,
  onOpenDeleteModal,
}: ApplicationStageBarProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      {/* Left Stage Action Buttons with State Machine Prevention */}
      <div className="flex items-center gap-2 flex-wrap">
        {app && (
          <StageSelector
            currentStage={app.stage}
            onSelectStage={onSelectStage}
            disabled={isUpdatingStage}
            variant="buttons"
          />
        )}
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          className="h-8 px-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 shadow-xs flex items-center gap-1.5 opacity-50 cursor-not-allowed transition-colors"
          title={`${t("applications.scheduleInterview")} (Coming soon)`}
        >
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{t("applications.scheduleInterview")}</span>
        </button>

        <button
          type="button"
          disabled={isDeleting}
          onClick={onOpenDeleteModal}
          className="h-8 px-3 rounded-xl border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{t("applications.deleteApplication")}</span>
        </button>
      </div>
    </div>
  );
}
