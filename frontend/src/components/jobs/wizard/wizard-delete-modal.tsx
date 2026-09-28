"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MacOsModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface WizardDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobTitle: string;
  isDeleting: boolean;
}

export function WizardDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  isDeleting,
}: WizardDeleteModalProps) {
  const { t } = useI18n();

  return (
    <MacOsModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("jobs.wizard.deleteConfirmTitle")}
      size="sm"
      contentClassName="p-5 sm:p-6 space-y-4 bg-[#fbfbfd] dark:bg-[#1a1a1a]"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("jobs.wizard.deleteConfirmTitle")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("jobs.wizard.deleteConfirmQuestion", { title: jobTitle })}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-white/5 p-3 rounded-xl">
          {t("jobs.wizard.deleteConfirmNotice")}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="h-8 px-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-8 px-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-2xs"
          >
            {isDeleting ? t("jobs.wizard.deletingAction") : t("jobs.wizard.confirmDeleteButton")}
          </Button>
        </div>
      </div>
    </MacOsModal>
  );
}
