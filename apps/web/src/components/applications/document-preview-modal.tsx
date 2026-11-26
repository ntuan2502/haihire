"use client";

import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CandidateDocument } from "@/types";
import { AuthenticatedDocumentViewer, PreviewModal } from "@/components/shared";
import { cn } from "@/lib/utils";
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
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const handleClose = () => {
    setPreviewSrc(null);
    onClose();
  };

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
      onClose={handleClose}
      title={document?.name || t("common.details")}
      size="xl"
      height="h-[90dvh]"
      allowMaximize={true}
      headerActions={
        document ? (
          <div className="flex items-center gap-1.5">
            {previewSrc && (
              <a
                href={previewSrc}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-2xs",
                )}
              >
                <ExternalLink
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <span>{t("candidates.openInNewTab")}</span>
              </a>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={handleDownloadClick}
              className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{t("common.download")}</span>
            </Button>
          </div>
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
            onPreviewSrcChange={setPreviewSrc}
          />
        </div>
      )}
    </PreviewModal>
  );
}
