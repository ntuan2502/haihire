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
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          {t("interviews.title")}
        </h1>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground border border-border">
          {totalCount}
        </span>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        {canEdit && (
          <Button
            size="sm"
            onClick={onOpenScheduleModal}
            className="h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t("interviews.scheduleNew")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
