"use client";

import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import type { Application } from "@/types";

interface ApplicationNotesCardProps {
  app: Application | null | undefined;
}

export function ApplicationNotesCard({ app }: ApplicationNotesCardProps) {
  if (!app?.id) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <ApplicationNotesStream applicationId={app.id} />
    </div>
  );
}
