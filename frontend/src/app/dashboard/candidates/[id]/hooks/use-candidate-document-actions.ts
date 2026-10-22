import { useState, useRef, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { fixUtf8String } from "@/lib/utils";
import { getDocumentUrl, downloadAuthenticatedFile } from "@/lib/api";
import {
  useUploadCandidateDocumentMutation,
  useDeleteCandidateDocumentMutation,
  useDeleteDocumentMutation,
} from "@/hooks/use-queries";
import type { Candidate, CandidateDocument } from "@/types";

interface UseCandidateDocumentActionsProps {
  candidate: Candidate | null | undefined;
  documentFilter: string;
}

export function useCandidateDocumentActions({
  candidate,
  documentFilter,
}: UseCandidateDocumentActionsProps) {
  const { t } = useI18n();
  const docInputRef = useRef<HTMLInputElement>(null);

  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<CandidateDocument | null>(
    null,
  );
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  const uploadCandidateDocMutation = useUploadCandidateDocumentMutation();
  const deleteCandidateDocMutation = useDeleteCandidateDocumentMutation();
  const deleteAppDocMutation = useDeleteDocumentMutation();

  const handleDocumentUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && candidate) {
      const file = e.target.files[0];
      try {
        setIsUploadingDoc(true);
        await uploadCandidateDocMutation.mutateAsync({
          id: candidate.id,
          file,
          type: documentFilter,
        });
      } catch (err) {
        console.error("Failed to upload document:", err);
        toast.error(getApiErrorMessage(err, t));
      } finally {
        setIsUploadingDoc(false);
        if (docInputRef.current) docInputRef.current.value = "";
      }
    }
  };

  const handleDownloadDoc = async (
    url: string,
    filename?: string,
    appId?: string,
  ) => {
    const rawFileName = filename || "document.pdf";
    const downloadFileName = fixUtf8String(rawFileName);
    const queryParams = new URLSearchParams();
    if (url) queryParams.set("url", url);
    if (downloadFileName) queryParams.set("name", downloadFileName);
    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    const downloadPath = appId
      ? `/applications/${appId}/documents/download${queryString}`
      : candidate
        ? `/candidates/${candidate.id}/documents/download${queryString}`
        : getDocumentUrl(url);

    try {
      await downloadAuthenticatedFile(downloadPath, downloadFileName);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!candidate || !docToDelete) return;
    try {
      setIsDeletingDoc(true);
      if (docToDelete.sourceApplicationId) {
        await deleteAppDocMutation.mutateAsync({
          id: docToDelete.sourceApplicationId,
          documentId: docToDelete.id,
          url: docToDelete.url,
        });
      } else {
        await deleteCandidateDocMutation.mutateAsync({
          id: candidate.id,
          documentId: docToDelete.id,
          url: docToDelete.url,
        });
      }
      if (
        previewDoc?.id === docToDelete.id ||
        previewDoc?.url === docToDelete.url
      ) {
        setPreviewDoc(null);
      }
      setDocToDelete(null);
    } catch (err) {
      console.error("Failed to delete document:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsDeletingDoc(false);
    }
  };

  return {
    docInputRef,
    previewDoc,
    setPreviewDoc,
    docToDelete,
    setDocToDelete,
    isUploadingDoc,
    isDeletingDoc,
    handleDocumentUpload,
    handleDownloadDoc,
    handleConfirmDeleteDoc,
  };
}
