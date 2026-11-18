import { ArrowLeft, Download, FileText } from "lucide-react";
import { AuthenticatedDocumentViewer } from "@/components/shared/authenticated-document-viewer";
import { useI18n } from "@/i18n";
import type { CandidateDocument } from "@/types";

interface CandidateDocumentPreviewProps {
  previewDoc: CandidateDocument;
  candidateId?: string;
  onClose: () => void;
  onDownload: () => void;
}

export function CandidateDocumentPreview({
  previewDoc,
  candidateId,
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
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("common.back")}</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer"
          title={t("candidates.viewResume")}
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Document Title */}
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span>{previewDoc.name}</span>
      </div>

      {/* Embedded Document Viewer */}
      <div className="w-full h-[650px] rounded-xl border border-border overflow-hidden bg-muted/40 shadow-inner">
        <AuthenticatedDocumentViewer
          document={previewDoc}
          candidateId={candidateId}
          onDownload={() => onDownload()}
        />
      </div>
    </div>
  );
}
