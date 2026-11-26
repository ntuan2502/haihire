import { Plus, Briefcase, CalendarPlus, MessageSquare } from "lucide-react";
import { CustomSelect } from "@/components/shared/custom-select";
import { StageBadge } from "@/components/shared/stage-badge";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import {
  getInterviewsFromApplication,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { formatDate } from "@/lib/utils";
import { getStageLabel } from "@/lib/stages";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import type { Application, Job } from "@/types";

interface CandidateApplicationsTabProps {
  jobs: Job[];
  stageFilter: string;
  setStageFilter: (val: string) => void;
  filteredCandidateApps: Application[];
  canEdit: boolean;
  onOpenApplyModal: () => void;
  onScheduleInterview: (
    app: Application,
    intv: ScheduledInterviewInfo | null,
  ) => void;
  onCancelInterview: (
    app: Application,
    intvOrId?: ScheduledInterviewInfo | string,
  ) => void;
}

export function CandidateApplicationsTab({
  jobs,
  stageFilter,
  setStageFilter,
  filteredCandidateApps,
  canEdit: _canEdit,
  onOpenApplyModal,
  onScheduleInterview,
  onCancelInterview,
}: CandidateApplicationsTabProps) {
  const { t } = useI18n();
  const hasCreateApplication = useHasPermission("application:create");
  const hasCreateInterview = useHasPermission("interview:create");
  const hasUpdateInterview = useHasPermission("interview:update");
  const hasDeleteInterview = useHasPermission("interview:delete");

  return (
    <div className="space-y-4">
      {/* Applications Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <CustomSelect
          value={stageFilter}
          onChange={(v) => setStageFilter(v)}
          options={[
            { value: "ALL", label: t("common.all") },
            { value: "APPLIED", label: t("pipeline.stages.applied") },
            { value: "SCREENING", label: t("pipeline.stages.screening") },
            { value: "INTERVIEW", label: t("pipeline.stages.interview") },
            { value: "OFFER", label: t("pipeline.stages.offer") },
            { value: "HIRED", label: t("pipeline.stages.hired") },
            { value: "REJECTED", label: t("pipeline.stages.rejected") },
          ]}
          size="sm"
          triggerClassName="h-8 w-36 text-xs font-normal"
        />

        {hasCreateApplication && (
          <button
            type="button"
            onClick={onOpenApplyModal}
            className="h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("candidates.applyToJob")}</span>
          </button>
        )}
      </div>

      {filteredCandidateApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-1">
            <Briefcase className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-semibold text-foreground">
            {t("candidates.noApplications")}
          </h4>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredCandidateApps.map((app) => {
            const job = jobs.find((j) => j.id === app.jobId);
            const allInterviews = getInterviewsFromApplication(app);
            return (
              <div key={app.id} className="py-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-semibold text-foreground break-words">
                      {job?.title || t("common.positionFallback")}
                    </h4>
                    <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>
                        {t("candidates.stage")}: {getStageLabel(app.stage, t)}
                      </span>
                      <span>•</span>
                      <span>
                        {t("candidates.appliedDate")}{" "}
                        {formatDate(app.createdAt)}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <StageBadge stage={app.stage} />
                    {hasCreateInterview && allInterviews.length === 0 && (
                      <button
                        type="button"
                        onClick={() => onScheduleInterview(app, null)}
                        className="h-7 px-2.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CalendarPlus
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        <span>{t("interviews.scheduleInterview")}</span>
                      </button>
                    )}
                  </div>
                </div>

                <CandidateInterviewsList
                  application={app}
                  onSchedule={(intv) => onScheduleInterview(app, intv || null)}
                  onCancelInterview={(intv) => onCancelInterview(app, intv)}
                  canEdit={
                    hasCreateInterview ||
                    hasUpdateInterview ||
                    hasDeleteInterview
                  }
                  showSectionHeader={false}
                  hideIfEmpty={allInterviews.length === 0}
                />

                {app.applicationNotes && app.applicationNotes.length > 0 && (
                  <div className="text-[11px] text-foreground/90 bg-muted/50 border border-border p-2.5 rounded-lg flex items-start gap-2">
                    <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {app.applicationNotes[0]?.content}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
