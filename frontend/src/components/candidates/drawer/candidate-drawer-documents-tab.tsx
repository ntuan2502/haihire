"use client";

import { useRef, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { CustomSelect } from "@/components/shared/custom-select";
import { getDocumentUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { CandidateDocument } from "@/types";
import { useI18n } from "@/i18n";

export interface CandidateDrawerDocumentsTabProps {
  canEdit: boolean;
  docFilter: string;
  onDocFilterChange: (filter: string) => void;
  documents: CandidateDocument[];
  previewDoc: CandidateDocument | null;
  onPreviewDoc: (doc: CandidateDocument | null) => void;
  onDownloadDoc: (
    docUrl: string,
    docName: string,
    appId?: string,
  ) => Promise<void>;
  onDeleteDoc: (doc: CandidateDocument) => void;
  onUploadDoc: (file: File) => Promise<void>;
  isUploading: boolean;
}

export function CandidateDrawerDocumentsTab({
  canEdit,
  docFilter,
  onDocFilterChange,
  documents,
  previewDoc,
  onPreviewDoc,
  onDownloadDoc,
  onDeleteDoc,
  onUploadDoc,
  isUploading,
}: CandidateDrawerDocumentsTabProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        await onUploadDoc(file);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  if (previewDoc) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onPreviewDoc(null)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("candidates.backToDocuments")}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onDownloadDoc(
                previewDoc.url,
                previewDoc.name,
                previewDoc.sourceApplicationId,
              )
            }
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t("common.download")}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{previewDoc.name}</span>
        </div>

        <div className="w-full h-[500px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner">
          <iframe
            src={getDocumentUrl(previewDoc.url)}
            className="w-full h-full border-0"
            title={previewDoc.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CustomSelect
          value={docFilter}
          onChange={onDocFilterChange}
          options={[
            { value: "All", label: t("common.all") },
            { value: "Resume", label: t("candidates.resume") },
            {
              value: "Cover Letter",
              label: t("candidates.coverLetter"),
            },
            { value: "Other", label: t("common.other") },
          ]}
          size="sm"
          triggerClassName="h-7 w-28 text-xs font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
        />

        {canEdit && (
          <div>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <UploadCloud className="h-3 w-3 text-slate-500" />
              )}
              <span>{t("candidates.uploadDoc")}</span>
            </button>
            <input
              id="drawer-doc-upload"
              name="drawer-doc-upload"
              aria-label={t("candidates.uploadDoc")}
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2.5">
          {documents.map((doc) => (
            <div
              key={doc.id || doc.url}
              className="p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {doc.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap">
                    <span>{doc.type || t("candidates.resume")}</span>
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

              <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
                <button
                  type="button"
                  onClick={() => onPreviewDoc(doc)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("common.preview")}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDownloadDoc(doc.url, doc.name, doc.sourceApplicationId)
                  }
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("common.download")}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDeleteDoc(doc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <label
          htmlFor="drawer-doc-upload"
          className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors block"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 mb-0.5">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("candidates.noDocuments")}
          </h4>
          <p className="text-[10px] text-slate-400 max-w-xs">
            {t("candidates.uploadDocHint")}
          </p>
        </label>
      )}
    </div>
  );
}
