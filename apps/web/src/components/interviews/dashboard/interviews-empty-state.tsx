"use client";

import { useI18n } from "@/i18n";
import { Calendar } from "lucide-react";

export function InterviewsEmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card text-card-foreground px-6 py-12 sm:p-16 text-center shadow-xs w-full my-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
        <Calendar className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {t("interviews.noInterviewsFound")}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mt-1">
        {t("interviews.noInterviewsFoundDesc")}
      </p>
    </div>
  );
}
