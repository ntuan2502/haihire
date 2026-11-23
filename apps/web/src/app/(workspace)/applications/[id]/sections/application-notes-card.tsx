"use client";

import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import type { Application } from "@/types";

interface ApplicationNotesCardProps {
  app: Application | null | undefined;
}

export function ApplicationNotesCard({ app }: ApplicationNotesCardProps) {
  if (!app?.id) return null;

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs">
      <ApplicationNotesStream applicationId={app.id} />
    </div>
  );
}
