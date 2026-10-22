"use client";

import Link from "next/link";
import {
  Briefcase,
  Calendar,
  ExternalLink,
  MessageSquare,
  Plus,
} from "lucide-react";
import { CustomSelect } from "@/components/shared/custom-select";
import { StageBadge } from "@/components/shared/stage-badge";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { formatDate, type CandidateItem } from "@/lib/utils";
import {
  getInterviewsFromApplication,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import type { Application, Job } from "@/types";
import { useI18n } from "@/i18n";

export interface CandidateDrawerApplicationsTabProps {
  candidate: CandidateItem;
  jobs: Job[];
  canEdit: boolean;
  stageFilter: string;
  onStageFilterChange: (stage: string) => void;
  applications: Application[];
  totalApplicationsCount: number;
  onApplyToJob: (candidate: CandidateItem) => void;
  onScheduleInterview: (
    app: Application,
    interview?: ScheduledInterviewInfo | null,
  ) => void;
  onCancelInterview: (
    app: Application,
    interviewOrId?: ScheduledInterviewInfo | string,
  ) => void;
}

export function CandidateDrawerApplicationsTab({
  candidate,
  jobs,
  canEdit,
  stageFilter,
  onStageFilterChange,
  applications,
  totalApplicationsCount,
  onApplyToJob,
  onScheduleInterview,
  onCancelInterview,
}: CandidateDrawerApplicationsTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CustomSelect
          value={stageFilter}
          onChange={onStageFilterChange}
          options={[
            { value: "ALL", label: t("candidates.allStages") },
            { value: "APPLIED", label: t("pipeline.stages.applied") },
            { value: "SCREENING", label: t("pipeline.stages.screening") },
            { value: "INTERVIEW", label: t("pipeline.stages.interview") },
            { value: "OFFER", label: t("pipeline.stages.offer") },
            { value: "HIRED", label: t("pipeline.stages.hired") },
            { value: "REJECTED", label: t("pipeline.stages.rejected") },
          ]}
          size="sm"
          triggerClassName="h-7 w-28 text-[11px] font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
        />

        {canEdit && (
          <button
            type="button"
            onClick={() => onApplyToJob(candidate)}
            className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>{t("candidates.applyToJob")}</span>
          </button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
            <Briefcase className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {totalApplicationsCount === 0
              ? t("candidates.noApplicationsYet")
              : t("candidates.noApplicationsMatchingStage")}
          </h4>
          <p className="text-[11px] text-slate-400">
            {totalApplicationsCount === 0
              ? t("candidates.applyCandidateHint")
              : t("candidates.trySelectingDifferentStage")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {applications.map((app: Application) => {
            const job = jobs.find((j) => j.id === app.jobId);
            const allInterviews = getInterviewsFromApplication(app);
            return (
              <div key={app.id} className="py-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">
                      {job?.title || "Position"}
                    </h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      {t("common.status")}: {app.stage} •{" "}
                      {t("applications.appliedBadge")}{" "}
                      {formatDate(app.createdAt, "short")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StageBadge stage={app.stage} />
                    <Link
                      href={`/dashboard/applications/${app.id}`}
                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                      title={t("applications.viewApplication")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {canEdit && allInterviews.length === 0 && (
                      <button
                        type="button"
                        onClick={() => onScheduleInterview(app)}
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
                  onSchedule={(intv) => onScheduleInterview(app, intv)}
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
