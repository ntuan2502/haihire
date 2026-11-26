import type { ChangeEvent, RefObject } from "react";
import { FileText, Eye, Download, Trash2, Loader2, Upload } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getDocumentTypeLabel } from "@/lib/roles";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import type { CandidateDocument } from "@/types";

interface CandidateDocumentsTabProps {
  documents: CandidateDocument[];
  canEdit: boolean;
  isUploadingDoc: boolean;
  docInputRef: RefObject<HTMLInputElement | null>;
  onDocumentUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, appId?: string) => void;
  onDeleteDoc: (doc: CandidateDocument) => void;
}

export function CandidateDocumentsTab({
  documents,
  canEdit: _canEdit,
  isUploadingDoc,
  docInputRef,
  onDocumentUpload,
  onPreviewDoc,
  onDownloadDoc,
  onDeleteDoc,
}: CandidateDocumentsTabProps) {
  const { t } = useI18n();
  const hasUploadDoc = useHasPermission("candidate:document_upload");
  const hasDeleteDoc = useHasPermission("candidate:document_delete");

  return (
    <div className="space-y-4">
      {/* Document Toolbar: Upload Button */}
      {hasUploadDoc && (
        <div className="flex items-center justify-end gap-3">
          <div>
            <button
              type="button"
              disabled={isUploadingDoc}
              onClick={() => docInputRef.current?.click()}
              className="h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isUploadingDoc ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span>{t("candidates.uploadDoc")}</span>
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={onDocumentUpload}
            />
          </div>
        </div>
      )}

      {/* Document Cards List */}
      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id || doc.url}
              className="p-4 rounded-xl border border-border bg-card/60 text-card-foreground shadow-xs flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground truncate">
                    {doc.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                    <span>{getDocumentTypeLabel(doc.type, t)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.createdAt, "short")}</span>
                  </div>
                </div>
              </div>

              {/* 3 action buttons: View, Download, Delete */}
              <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => onPreviewDoc(doc)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer"
                  aria-label={t("common.preview")}
                  title={t("common.preview")}
                >
                  <Eye className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDownloadDoc(doc.url, doc.name, doc.sourceApplicationId)
                  }
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer"
                  title={t("common.download")}
                >
                  <Download className="h-4 w-4" />
                </button>

                {hasDeleteDoc && (
                  <button
                    type="button"
                    onClick={() => onDeleteDoc(doc)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <button
          type="button"
          onClick={() => hasUploadDoc && docInputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-border p-10 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-accent/40 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-semibold text-foreground">
            {t("candidates.noDocuments")}
          </h4>
          <p className="text-[11px] text-muted-foreground max-w-sm">
            {t("candidates.uploadDocHint")}
          </p>
        </button>
      )}
    </div>
  );
}
