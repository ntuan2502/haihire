"use client";

import { Loader2 } from "lucide-react";
import { MacOsModal } from "@/components/shared";
import { useI18n } from "@/i18n";

interface DeleteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteDocumentModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteDocumentModalProps) {
  const { t } = useI18n();

  return (
    <MacOsModal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={t("applications.deleteDocumentHeading")}
      size="sm"
      contentClassName="p-5 sm:p-6 space-y-4 bg-[#fbfbfd] dark:bg-[#1a1a1a]"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t("applications.deleteDocumentWarning")}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-white/10">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="h-8 px-3.5 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{isLoading ? t("common.loading") : t("common.delete")}</span>
          </button>
        </div>
      </div>
    </MacOsModal>
  );
}
