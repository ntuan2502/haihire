"use client";

import type { JobStatus } from "@/types";
import { useI18n } from "@/i18n";

export interface JobStatusBadgeProps {
  status: JobStatus | string;
  className?: string;
}

export function JobStatusBadge({
  status,
  className = "",
}: JobStatusBadgeProps) {
  const { t } = useI18n();

  if (status === "PUBLISHED") {
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60 ${className}`}
      >
        {t("jobs.openStatus")}
      </span>
    );
  }

  if (status === "CLOSED") {
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border ${className}`}
      >
        {t("jobs.closed")}
      </span>
    );
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60 ${className}`}
    >
      {t("jobs.draftStatus")}
    </span>
  );
}
