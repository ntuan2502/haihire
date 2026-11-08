import type { ChangeEvent, RefObject } from "react";
import {
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { CustomSelect } from "@/components/shared/custom-select";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { CandidateDocument } from "@/types";

interface CandidateDocumentsTabProps {
  documentFilter: string;
  setDocumentFilter: (val: string) => void;
  filteredDocuments: CandidateDocument[];
  canEdit: boolean;
  isUploadingDoc: boolean;
  docInputRef: RefObject<HTMLInputElement | null>;
  onDocumentUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, appId?: string) => void;
  onDeleteDoc: (doc: CandidateDocument) => void;
}

export function CandidateDocumentsTab({
  documentFilter,
  setDocumentFilter,
  filteredDocuments,
  canEdit,
  isUploadingDoc,
  docInputRef,
  onDocumentUpload,
  onPreviewDoc,
  onDownloadDoc,
  onDeleteDoc,
}: CandidateDocumentsTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Document Toolbar: Filter + Upload Button */}
      <div className="flex items-center justify-between gap-3">
        <CustomSelect
          value={documentFilter}
          onChange={(v) => setDocumentFilter(v)}
          options={[
            { value: "All", label: t("common.all") },
            { value: "Resume", label: t("candidates.resume") },
            { value: "Cover Letter", label: t("candidates.coverLetter") },
            { value: "Other", label: t("common.other") },
          ]}
          size="sm"
          triggerClassName="h-8 w-32 text-xs font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
        />

        {canEdit && (
          <div>
            <button
              type="button"
              disabled={isUploadingDoc}
              onClick={() => docInputRef.current?.click()}
              className="h-8 px-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isUploadingDoc ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>{t("candidates.uploadDoc")}</span>
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={onDocumentUpload}
            />
          </div>
        )}
      </div>

      {/* Document Cards List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id || doc.url}
              className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {doc.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                    <span>{doc.type || "Resume"}</span>
                    <span>•</span>
                    <span>{formatDate(doc.createdAt, "short")}</span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => onPreviewDoc(doc)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline cursor-pointer"
                    >
                      {t("candidates.clickToPreview")}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 action buttons: View, Download, Delete */}
              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                <button
                  type="button"
                  onClick={() => onPreviewDoc(doc)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("common.preview")}
                >
                  <Eye className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDownloadDoc(doc.url, doc.name, doc.sourceApplicationId)
                  }
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("common.download")}
                >
                  <Download className="h-4 w-4" />
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDeleteDoc(doc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
          onClick={() => docInputRef.current?.click()}
          className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 p-10 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <FileText className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("candidates.noDocuments")}
          </h4>
          <p className="text-[11px] text-slate-400 max-w-sm">
            {t("candidates.uploadDocHint")}
          </p>
        </button>
      )}
    </div>
  );
}
