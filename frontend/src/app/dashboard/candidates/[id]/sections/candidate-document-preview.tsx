import { ArrowLeft, Download, FileText } from "lucide-react";
import { getDocumentUrl } from "@/lib/api";
import { useI18n } from "@/i18n";
import type { CandidateDocument } from "@/types";

interface CandidateDocumentPreviewProps {
  previewDoc: CandidateDocument;
  onClose: () => void;
  onDownload: () => void;
}

export function CandidateDocumentPreview({
  previewDoc,
  onClose,
  onDownload,
}: CandidateDocumentPreviewProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Back button & Download */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("common.back")}</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={t("candidates.viewResume")}
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Document Title */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
        <FileText className="h-4 w-4 text-slate-400" />
        <span>{previewDoc.name}</span>
      </div>

      {/* Embedded Document Viewer */}
      <div className="w-full h-[650px] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner">
        <iframe
          src={getDocumentUrl(previewDoc.url)}
          className="w-full h-full border-0"
          title={previewDoc.name}
        />
      </div>
    </div>
  );
}
