"use client";

import { useI18n } from "@/i18n";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export interface InterviewsHeaderProps {
  totalCount?: number;
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
      actions={
        canEdit ? (
          <Button
            onClick={onOpenScheduleModal}
            className="h-9 px-3.5 sm:px-4 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{t("interviews.scheduleNew")}</span>
          </Button>
        ) : undefined
      }
    />
  );
}
