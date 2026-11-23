"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateDocument } from "@/types";
import { AuthenticatedDocumentViewer, PreviewModal } from "@/components/shared";
import { useI18n } from "@/i18n";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CandidateDocument | null;
  appId?: string;
  candidateId?: string;
  onDownload: (
    url: string,
    filename?: string,
    appId?: string,
  ) => Promise<void> | void;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  appId,
  candidateId,
  onDownload,
}: DocumentPreviewModalProps) {
  const { t } = useI18n();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadClick = async () => {
    if (!document || isDownloading) return;
    try {
      setIsDownloading(true);
      await onDownload(
        document.url,
        document.name,
        document.sourceApplicationId || appId,
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <PreviewModal
      isOpen={Boolean(isOpen && document)}
      onClose={onClose}
      title={document?.name || t("common.details")}
      size="xl"
      height="h-[90dvh]"
      allowMaximize={true}
      headerActions={
        document ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloading}
            onClick={handleDownloadClick}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{t("common.download")}</span>
          </Button>
        ) : undefined
      }
      contentClassName="flex-1 w-full overflow-hidden"
    >
      {document && (
        <div className="flex-1 w-full h-full bg-muted/40 overflow-hidden relative">
          <AuthenticatedDocumentViewer
            document={document}
            applicationId={appId}
            candidateId={candidateId}
            onDownload={onDownload}
          />
        </div>
      )}
    </PreviewModal>
  );
}
