"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MacOsModal } from "@/components/shared";
import { useI18n } from "@/i18n";

interface DeleteApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  candidateName: string;
  jobTitle: string;
  isDeleting?: boolean;
}

export function DeleteApplicationModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  jobTitle,
  isDeleting = false,
}: DeleteApplicationModalProps) {
  const { t } = useI18n();

  return (
    <MacOsModal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title={t("applications.deleteApplicationHeading")}
      size="sm"
      contentClassName="p-5 sm:p-6 space-y-4 bg-[#fbfbfd] dark:bg-[#1a1a1a]"
    >
      <div className="space-y-4">
        {/* Modal Message */}
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <strong className="font-semibold text-slate-900 dark:text-white">
            {candidateName}
          </strong>{" "}
          —{" "}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {jobTitle}
          </strong>
          . {t("applications.deleteApplicationWarning")}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={onClose}
            className="h-8 px-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isDeleting ? t("common.loading") : t("applications.deleteApplication")}</span>
          </Button>
        </div>
      </div>
    </MacOsModal>
  );
}
