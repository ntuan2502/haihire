"use client";

import React from "react";
import type { JobStatus } from "@/types";
import { useI18n } from "@/i18n";

interface JobStatusBadgeProps {
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
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60 ${className}`}
      >
        {t("jobs.openStatus")}
      </span>
    );
  }

  if (status === "CLOSED") {
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 ${className}`}
      >
        {t("jobs.closed")}
      </span>
    );
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60 ${className}`}
    >
      {t("jobs.draftStatus")}
    </span>
  );
}
