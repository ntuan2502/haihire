"use client";

import { useI18n } from "@/i18n";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

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
    <PageHeader
      title={t("interviews.title")}
      badge={totalCount}
      icon={Calendar}
      bordered
      actions={
        canEdit ? (
          <Button
            size="sm"
            onClick={onOpenScheduleModal}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{t("interviews.scheduleNew")}</span>
          </Button>
        ) : undefined
      }
    />
  );
}
