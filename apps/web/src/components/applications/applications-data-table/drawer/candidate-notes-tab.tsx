"use client";

import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";

interface CandidateNotesTabProps {
  applicationId: string;
}

export function CandidateNotesTab({ applicationId }: CandidateNotesTabProps) {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs">
      <ApplicationNotesStream applicationId={applicationId} />
    </div>
  );
}
