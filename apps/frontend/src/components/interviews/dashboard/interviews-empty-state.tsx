"use client";

import { useI18n } from "@/i18n";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InterviewsEmptyStateProps {
  canEdit: boolean;
  onOpenScheduleModal: () => void;
}

export function InterviewsEmptyState({
  canEdit,
  onOpenScheduleModal,
}: InterviewsEmptyStateProps) {
  const { t } = useI18n();

  return (
    <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 shadow-2xs">
      <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
        <Calendar className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {t("interviews.noInterviewsFound")}
      </h3>
      <p className="text-xs text-slate-400 max-w-md mx-auto">
        {t("interviews.noInterviewsFoundDesc")}
      </p>
      {canEdit && (
        <Button
          onClick={onOpenScheduleModal}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("interviews.scheduleNew")}</span>
        </Button>
      )}
    </div>
  );
}
