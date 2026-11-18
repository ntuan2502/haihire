"use client";

import { useRouter } from "next/navigation";
import { Edit2, ExternalLink, X } from "lucide-react";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

export interface CandidateDrawerHeaderProps {
  candidateId: string;
  onClose: () => void;
}

export function CandidateDrawerHeader({
  candidateId,
  onClose,
}: CandidateDrawerHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();
  const canUpdateCandidate = useHasPermission("candidate:update");

  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <span className="text-xs font-semibold text-muted-foreground">
        {t("candidates.candidateDetail")}
      </span>
      <div className="flex items-center gap-2">
        {canUpdateCandidate && (
          <button
            type="button"
            onClick={() => router.push(`/candidates/${candidateId}/edit`)}
            className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title={t("common.edit")}
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("common.edit")}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push(`/candidates/${candidateId}`)}
          className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title={t("candidates.openFullPage")}
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("candidates.openFullPage")}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
