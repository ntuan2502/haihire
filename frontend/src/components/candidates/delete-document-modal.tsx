"use client";

import React from "react";
import { Loader2 } from "lucide-react";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t("applications.deleteDocumentHeading")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t("applications.deleteDocumentWarning")}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="h-8 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="h-8 px-4 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{isLoading ? t("common.loading") : t("common.delete")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
