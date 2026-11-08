"use client";

import { FileText, Eye, Download } from "lucide-react";
import type { CandidateDocument } from "@/types";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface ApplicationDocumentsSectionProps {
  documents: CandidateDocument[];
  appId?: string;
  onPreview: (doc: CandidateDocument) => void;
  onDownload: (url: string, filename?: string, appId?: string) => void;
  showHeader?: boolean;
}

export function ApplicationDocumentsSection({
  documents,
  appId,
  onPreview,
  onDownload,
  showHeader = true,
}: ApplicationDocumentsSectionProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
      {showHeader && (
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span>{t("applications.documents")}</span>
        </h3>
      )}

      {documents.length > 0 ? (
        <div className="space-y-2.5">
          {documents.map((doc) => (
            <div
              key={doc.id || doc.url}
              className="p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {doc.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {doc.type || t("candidates.resume")} • {formatDate(doc.createdAt, "short")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  className="h-7 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t("common.preview")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDownload(doc.url, doc.name, appId)}
                  className="h-7 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t("common.download")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 py-1">{t("applications.noDocumentsUploaded")}</p>
      )}
    </div>
  );
}
