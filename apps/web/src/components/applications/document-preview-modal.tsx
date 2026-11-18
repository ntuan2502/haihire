"use client";

import { Download } from "lucide-react";
import type { CandidateDocument } from "@/types";
import { AuthenticatedDocumentViewer, CustomModal } from "@/components/shared";
import { useI18n } from "@/i18n";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CandidateDocument | null;
  appId?: string;
  candidateId?: string;
  onDownload: (url: string, filename?: string, appId?: string) => void;
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

  return (
    <CustomModal
      isOpen={Boolean(isOpen && document)}
      onClose={onClose}
      title={document?.name}
      size="xl"
      height="h-[90vh]"
      allowMaximize={true}
      headerRight={
        document ? (
          <button
            type="button"
            onClick={() =>
              onDownload(
                document.url,
                document.name,
                document.sourceApplicationId || appId,
              )
            }
            className="h-7 px-2.5 rounded-md border border-input bg-background text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("common.download")}</span>
          </button>
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
    </CustomModal>
  );
}
