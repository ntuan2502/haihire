"use client";

import { useRouter } from "next/navigation";
import { Edit2, ExternalLink, X } from "lucide-react";
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

  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {t("candidates.candidateDetail")}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/candidates/${candidateId}/edit`)
          }
          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title={t("common.edit")}
        >
          <Edit2 className="h-3.5 w-3.5 text-slate-400" />
          <span>{t("common.edit")}</span>
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/candidates/${candidateId}`)}
          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title={t("candidates.openFullPage")}
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          <span>{t("candidates.openFullPage")}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
