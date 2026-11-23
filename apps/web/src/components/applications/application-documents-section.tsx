"use client";

import { FileText, Eye, Download } from "lucide-react";
import type { CandidateDocument } from "@/types";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers";

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
  const { t, locale } = useI18n();
  const { localization } = useLocalization();

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-3">
      {showHeader && (
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("applications.documents")}</span>
        </h3>
      )}

      {documents.length > 0 ? (
        <div className="space-y-2.5">
          {documents.map((doc) => (
            <div
              key={doc.id || doc.url}
              className="p-3 rounded-xl border border-border bg-card text-card-foreground shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground truncate">
                    {doc.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.type || t("candidates.resume")} •{" "}
                    {formatDate(doc.createdAt, "short", {
                      ...localization,
                      defaultLanguage: locale,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  className="h-7 px-3 rounded-md border border-input bg-background text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("common.preview")}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDownload(
                      doc.url,
                      doc.name,
                      doc.sourceApplicationId || appId,
                    )
                  }
                  className="h-7 px-3 rounded-md border border-input bg-background text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("common.download")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-1">
          {t("applications.noDocumentsUploaded")}
        </p>
      )}
    </div>
  );
}
