"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={isDeleting ? undefined : onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog Container */}
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-4 transition-all">
          {/* Modal Title */}
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t("applications.deleteApplicationHeading")}
          </h3>

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
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
            >
              {t("common.cancel")}
            </Button>

            <Button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isDeleting ? t("common.loading") : t("applications.deleteApplication")}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
