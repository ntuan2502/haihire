"use client";

import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";

interface CandidateNotesTabProps {
  applicationId: string;
}

export function CandidateNotesTab({ applicationId }: CandidateNotesTabProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <ApplicationNotesStream applicationId={applicationId} />
    </div>
  );
}
