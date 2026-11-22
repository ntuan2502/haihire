"use client";

import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { InterviewScorecardModal } from "@/components/interviews/interview-scorecard-modal";
import { CancelInterviewModal } from "@/components/interviews/cancel-interview-modal";
import {
  InterviewsFilterDrawer,
  type SortOption,
  type ViewMode,
} from "./index";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { toast } from "@/lib/toast";
import { getCandidateDisplayName } from "@/lib/utils";
import type { Application, Job } from "@/types";

interface InterviewsModalsBundleProps {
  jobs: Job[];
  modalApplications: Application[];
  scheduleModalOpen: boolean;
  onCloseScheduleModal: () => void;
  selectedAppForSchedule?: Application;
  scheduleDate?: string;
  selectedInterviewForEdit?: ScheduledInterviewInfo;
  onScheduleJobChange: (jobId: string) => void;
  scorecardModalOpen: boolean;
  onCloseScorecardModal: () => void;
  selectedAppForScorecard?: Application;
  selectedInterviewForScorecard?: ScheduledInterviewInfo;
  isCancelModalOpen: boolean;
  onCloseCancelModal: () => void;
  cancelInterviewState: {
    app: Application;
    interview: ScheduledInterviewInfo;
  } | null;
  onDeleteInterview: (id: string) => Promise<unknown>;
  isCancellingInterview: boolean;
  isFilterOpen: boolean;
  onCloseFilter: () => void;
  selectedJobFilter: string;
  onJobFilterChange: (val: string) => void;
  activeTab: "ALL" | "UPCOMING" | "AWAITING";
  onTabChange: (tabId: string) => void;
  totalCandidateCount: number;
  scheduledCount: number;
  awaitingCount: number;
  sortBy: SortOption;
  onSortByChange: (val: string) => void;
  onResetFilters: () => void;
  viewMode: ViewMode;
}

/**
 * Groups the schedule, scorecard, cancel confirmation, and filter drawer
 * overlays rendered on the interviews workspace page.
 */
export function InterviewsModalsBundle({
  jobs,
  modalApplications,
  scheduleModalOpen,
  onCloseScheduleModal,
  selectedAppForSchedule,
  scheduleDate,
  selectedInterviewForEdit,
  onScheduleJobChange,
  scorecardModalOpen,
  onCloseScorecardModal,
  selectedAppForScorecard,
  selectedInterviewForScorecard,
  isCancelModalOpen,
  onCloseCancelModal,
  cancelInterviewState,
  onDeleteInterview,
  isCancellingInterview,
  isFilterOpen,
  onCloseFilter,
  selectedJobFilter,
  onJobFilterChange,
  activeTab,
  onTabChange,
  totalCandidateCount,
  scheduledCount,
  awaitingCount,
  sortBy,
  onSortByChange,
  onResetFilters,
  viewMode,
}: InterviewsModalsBundleProps) {
  const { t } = useI18n();

  return (
    <>
      <ScheduleInterviewModal
        isOpen={scheduleModalOpen}
        onClose={onCloseScheduleModal}
        jobs={jobs}
        applications={modalApplications}
        selectedJobId={selectedAppForSchedule?.jobId || undefined}
        selectedApplicationId={selectedAppForSchedule?.id || undefined}
        initialDate={scheduleDate}
        editingInterview={selectedInterviewForEdit}
        onJobChange={onScheduleJobChange}
      />

      <InterviewScorecardModal
        isOpen={scorecardModalOpen}
        onClose={onCloseScorecardModal}
        application={selectedAppForScorecard}
        interview={selectedInterviewForScorecard}
        job={jobs.find(
          (j) => String(j.id) === String(selectedAppForScorecard?.jobId),
        )}
      />

      <CancelInterviewModal
        isOpen={isCancelModalOpen}
        onClose={onCloseCancelModal}
        onConfirm={async () => {
          if (!cancelInterviewState?.interview?.id) return;
          try {
            await onDeleteInterview(cancelInterviewState.interview.id);
            onCloseCancelModal();
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t));
          }
        }}
        candidateName={
          cancelInterviewState
            ? getCandidateDisplayName(cancelInterviewState.app)
            : ""
        }
        isCancelling={isCancellingInterview}
      />

      <InterviewsFilterDrawer
        isOpen={isFilterOpen}
        onClose={onCloseFilter}
        jobs={jobs}
        selectedJobFilter={selectedJobFilter}
        onJobFilterChange={onJobFilterChange}
        activeTab={activeTab}
        onTabChange={onTabChange}
        totalCandidateCount={totalCandidateCount}
        scheduledCount={scheduledCount}
        awaitingCount={awaitingCount}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        onResetFilters={onResetFilters}
        viewMode={viewMode}
      />
    </>
  );
}
