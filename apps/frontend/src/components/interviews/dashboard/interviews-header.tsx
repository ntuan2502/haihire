"use client";

import { useI18n } from "@/i18n";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InterviewsHeaderProps {
  totalCount: number;
  canEdit: boolean;
  onOpenScheduleModal: () => void;
}

export function InterviewsHeader({
  totalCount,
  canEdit,
  onOpenScheduleModal,
}: InterviewsHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("interviews.title")}
        </h1>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
          {totalCount}
        </span>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        {canEdit && (
          <Button
            size="sm"
            onClick={onOpenScheduleModal}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t("interviews.scheduleNew")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
