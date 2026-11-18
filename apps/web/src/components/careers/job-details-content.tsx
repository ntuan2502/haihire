"use client";

import { useI18n } from "@/i18n";
import type { Job } from "@/types";

interface JobDetailsContentProps {
  job: Job;
}

export function JobDetailsContent({ job }: JobDetailsContentProps) {
  const { t } = useI18n();

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-card text-card-foreground border border-border shadow-xs space-y-8">
      {/* Job Overview */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {t("careers.jobDescription")}
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-normal">
          {job.description}
        </div>
      </div>

      {/* Requirements */}
      {job.requirements && (
        <div className="space-y-4 pt-6 border-t border-border">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("careers.requirements")}
          </h2>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-normal">
            {job.requirements}
          </div>
        </div>
      )}
    </div>
  );
}
