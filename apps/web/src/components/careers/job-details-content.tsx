"use client";

import { RichTextContent } from "@/components/shared/rich-text-content";
import { useI18n } from "@/i18n";
import type { Job } from "@/types";

interface JobDetailsContentProps {
  job: Job;
}

export function JobDetailsContent({ job }: JobDetailsContentProps) {
  const { t } = useI18n();

  return (
    <div className="p-6 sm:p-8 rounded-xl bg-card text-card-foreground border border-border space-y-8">
      {/* Job Description */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-foreground">
          {t("careers.jobDescription")}
        </h2>
        <RichTextContent content={job.description} />
      </div>
    </div>
  );
}
