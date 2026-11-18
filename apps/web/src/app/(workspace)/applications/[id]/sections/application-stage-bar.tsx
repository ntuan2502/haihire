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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card text-card-foreground p-3 rounded-xl border border-border shadow-xs">
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
            className="h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-xs font-semibold text-foreground shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title={t("applications.scheduleInterview")}
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>{t("applications.scheduleInterview")}</span>
          </button>
        )}

        {canDeleteApplication && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={onOpenDeleteModal}
            className="h-8 px-3 rounded-md border border-destructive/30 bg-background text-xs font-semibold text-destructive hover:bg-destructive/10 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t("applications.deleteApplication")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
