"use client";

import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import type { Application } from "@/types";

export function CandidateTimelineTab({
  currentApp,
}: {
  currentApp: Application;
}) {
  return (
    <CandidateTimeline
      candidateId={currentApp.candidateId}
      applicationId={currentApp.id}
      candidateName={currentApp.candidateName}
      candidateEmail={currentApp.candidateEmail}
    />
  );
}
