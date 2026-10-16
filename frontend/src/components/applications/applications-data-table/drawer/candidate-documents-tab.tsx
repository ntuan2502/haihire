"use client";

import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import type { CandidateDocument } from "@/types";

interface CandidateDocumentsTabProps {
  documents: CandidateDocument[];
  appId: string;
  onPreview: (doc: CandidateDocument) => void;
  onDownload: (url: string, filename?: string, targetAppId?: string) => Promise<void>;
}

export function CandidateDocumentsTab({
  documents,
  appId,
  onPreview,
  onDownload,
}: CandidateDocumentsTabProps) {
  return (
    <ApplicationDocumentsSection
      documents={documents}
      appId={appId}
      onPreview={onPreview}
      onDownload={onDownload}
    />
  );
}
