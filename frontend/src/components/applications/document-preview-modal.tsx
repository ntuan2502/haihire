"use client";

import { Download } from "lucide-react";
import type { CandidateDocument } from "@/types";
import { getDocumentUrl } from "@/lib/api";
import { MacOsModal } from "@/components/shared";
import { useI18n } from "@/i18n";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CandidateDocument | null;
  appId?: string;
  onDownload: (url: string, filename?: string, appId?: string) => void;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  appId,
  onDownload,
}: DocumentPreviewModalProps) {
  const { t } = useI18n();

  return (
    <MacOsModal
      isOpen={Boolean(isOpen && document)}
      onClose={onClose}
      title={document?.name}
      size="xl"
      headerRight={
        document ? (
          <button
            type="button"
            onClick={() => onDownload(document.url, document.name, appId)}
            className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>{t("common.download")}</span>
          </button>
        ) : undefined
      }
      contentClassName="flex-1 w-full overflow-hidden"
    >
      {document && (
        <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
          <iframe
            src={getDocumentUrl(document.url)}
            className="w-full h-full border-0"
            title={document.name}
          />
        </div>
      )}
    </MacOsModal>
  );
}
