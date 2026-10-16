"use client";

import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application } from "@/types";

interface CandidateInterviewsTabProps {
  application: Application;
  notes?: string | null;
  onSchedule: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (interviewOrId?: ScheduledInterviewInfo | string) => void;
  canEdit?: boolean;
}

export function CandidateInterviewsTab({
  application,
  notes,
  onSchedule,
  onCancelInterview,
  canEdit,
}: CandidateInterviewsTabProps) {
  return (
    <CandidateInterviewsList
      application={application}
      notes={notes}
      onSchedule={onSchedule}
      onCancelInterview={onCancelInterview}
      canEdit={canEdit}
      showSectionHeader={true}
    />
  );
}
