"use client";

import { FileText, Eye, Download } from "lucide-react";
import type { CandidateDocument } from "@/types";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers";
import { ApplicationSectionCard } from "@/components/applications/detail/application-section-card";

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

  const content =
    documents.length > 0 ? (
      <div className="divide-y divide-border rounded-xl border border-border bg-background/40 overflow-hidden">
        {documents.map((doc) => (
          <div
            key={doc.id || doc.url}
            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
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
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {t("applications.noDocumentsUploaded")}
      </p>
    );

  if (!showHeader) {
    return (
      <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-3">
        {content}
      </div>
    );
  }

  return (
    <ApplicationSectionCard
      icon={FileText}
      title={t("applications.documents")}
      statusMeta={
        <span className="text-xs text-muted-foreground">
          {documents.length > 0
            ? t("applications.documentsCount", { count: documents.length })
            : t("applications.noDocumentsBadge")}
        </span>
      }
      collapsible
      bodyDivider={documents.length === 0}
      testId="application-documents-section"
    >
      {content}
    </ApplicationSectionCard>
  );
}
