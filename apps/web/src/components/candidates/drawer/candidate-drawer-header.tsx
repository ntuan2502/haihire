"use client";

import { useRouter } from "next/navigation";
import { Pencil, ExternalLink, X } from "lucide-react";
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
    <div className="shrink-0 flex items-center justify-between gap-2 flex-wrap border-b border-border px-4 sm:px-6 py-3.5">
      <span className="text-xs font-semibold text-muted-foreground">
        {t("candidates.candidateDetail")}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 sm:order-last"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-end gap-2 flex-wrap w-full sm:w-auto sm:ml-auto">
        {canUpdateCandidate && (
          <button
            type="button"
            onClick={() => router.push(`/candidates/${candidateId}/edit`)}
            className="h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title={t("common.edit")}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("common.edit")}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push(`/candidates/${candidateId}`)}
          className="h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title={t("candidates.openFullPage")}
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("candidates.openFullPage")}</span>
        </button>
      </div>
    </div>
  );
}
