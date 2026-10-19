import { Plus, Briefcase, Calendar, MessageSquare } from "lucide-react";
import { CustomSelect } from "@/components/shared/custom-select";
import { StageBadge } from "@/components/shared/stage-badge";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import {
  getInterviewsFromApplication,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { formatDate } from "@/lib/utils";
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
  canEdit,
  onOpenApplyModal,
  onScheduleInterview,
  onCancelInterview,
}: CandidateApplicationsTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Applications Action Row */}
      <div className="flex items-center justify-between gap-3">
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
          triggerClassName="h-8 w-36 text-xs font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
        />

        {canEdit && (
          <button
            type="button"
            onClick={onOpenApplyModal}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("candidates.applyToJob")}</span>
          </button>
        )}
      </div>

      {filteredCandidateApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
            <Briefcase className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("candidates.noApplications")}
          </h4>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCandidateApps.map((app) => {
            const job = jobs.find((j) => j.id === app.jobId);
            const allInterviews = getInterviewsFromApplication(app);
            return (
              <div key={app.id} className="py-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {job?.title || "Position"}
                    </h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>
                        {t("candidates.stage")}: {app.stage}
                      </span>
                      <span>•</span>
                      <span>
                        {t("candidates.appliedDate")}{" "}
                        {formatDate(app.createdAt)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StageBadge stage={app.stage} />
                    {canEdit && allInterviews.length === 0 && (
                      <button
                        type="button"
                        onClick={() => onScheduleInterview(app, null)}
                        className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Calendar className="h-3 w-3" />
                        <span>{t("interviews.scheduleInterview")}</span>
                      </button>
                    )}
                  </div>
                </div>

                <CandidateInterviewsList
                  application={app}
                  notes={app.notes}
                  onSchedule={(intv) => onScheduleInterview(app, intv || null)}
                  onCancelInterview={(intv) => onCancelInterview(app, intv)}
                  canEdit={canEdit}
                  showSectionHeader={false}
                  hideIfEmpty={allInterviews.length === 0}
                />

                {app.notes && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 p-2.5 rounded-xl flex items-start gap-2">
                    <MessageSquare className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{app.notes}</span>
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
