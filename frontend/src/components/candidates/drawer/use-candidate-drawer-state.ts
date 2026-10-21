"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  useCandidate,
  useUploadCandidateDocumentMutation,
  useDeleteCandidateDocumentMutation,
  useDeleteDocumentMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import { downloadAuthenticatedFile } from "@/lib/api";
import {
  formatDate,
  parseCandidateNotes,
  parseCandidateDocuments,
  fixUtf8String,
  getGenderLabel,
  type CandidateItem,
} from "@/lib/utils";
import {
  getInterviewsFromApplication,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/i18n";
import type { CandidateDocument, Application } from "@/types";

export interface UseCandidateDrawerStateProps {
  candidate: CandidateItem | null;
}

export function useCandidateDrawerState({
  candidate,
}: UseCandidateDrawerStateProps) {
  const { t } = useI18n();

  // Fetch full details of the candidate
  const { data: fullCandidate } = useCandidate(candidate?.id || null);

  // Drawer Tabs State
  const [drawerTab, setDrawerTab] = useState<"applications" | "documents">(
    "applications",
  );
  const [drawerStageFilter, setDrawerStageFilter] = useState<string>("ALL");
  const [drawerDocFilter, setDrawerDocFilter] = useState<string>("All");
  const [drawerPreviewDoc, setDrawerPreviewDoc] =
    useState<CandidateDocument | null>(null);
  const [isUploadingDrawerDoc, setIsUploadingDrawerDoc] = useState(false);
  const [drawerDocToDelete, setDrawerDocToDelete] =
    useState<CandidateDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Mutations
  const uploadCandidateDocMutation = useUploadCandidateDocumentMutation();
  const deleteCandidateDocMutation = useDeleteCandidateDocumentMutation();
  const deleteAppDocMutation = useDeleteDocumentMutation();
  const deleteInterviewMutation = useDeleteInterviewMutation();

  const selectedCandidateDetails = useMemo(() => {
    if (!candidate) {
      return {
        gender: "—",
        dob: "—",
        firstName: "",
        lastName: "",
        displayName: "",
        customNotes: "",
      };
    }
    const cand = fullCandidate || candidate.candidate;
    const notesParsed = parseCandidateNotes(
      cand?.notes,
      cand?.name || candidate.name,
    );
    const genderLabel = getGenderLabel(cand?.gender, t);
    const dobFormatted = cand?.dateOfBirth
      ? formatDate(cand.dateOfBirth, "short")
      : "—";
    return {
      gender: genderLabel,
      dob: dobFormatted,
      firstName: cand?.firstName || "",
      lastName: cand?.lastName || "",
      displayName: cand?.name || candidate.name || "",
      customNotes: notesParsed.customNotes || cand?.notes || "",
    };
  }, [candidate, fullCandidate, t]);

  const selectedCandidateApps = useMemo(() => {
    if (!candidate) return [];
    return (
      fullCandidate?.applications || candidate.candidate?.applications || []
    );
  }, [candidate, fullCandidate]);

  const filteredDrawerApps = useMemo(() => {
    if (drawerStageFilter === "ALL") return selectedCandidateApps;
    return selectedCandidateApps.filter(
      (app: Application) => app.stage === drawerStageFilter,
    );
  }, [selectedCandidateApps, drawerStageFilter]);

  const drawerCandidateDocuments: CandidateDocument[] = useMemo(() => {
    if (!candidate) return [];
    if (fullCandidate?.allDocuments && fullCandidate.allDocuments.length > 0) {
      return fullCandidate.allDocuments;
    }
    const cand = fullCandidate || candidate.candidate;
    const docs = parseCandidateDocuments(cand?.notes);
    if (docs.length === 0 && cand?.resumeUrl) {
      return [
        {
          id: `resume-${cand.id}`,
          name: cand.resumeFileName || "Resume.pdf",
          url: cand.resumeUrl,
          size: cand.resumeFileSize,
          mimeType: cand.resumeMimeType,
          type: "Resume",
          createdAt: cand.createdAt,
        },
      ];
    }
    return docs;
  }, [candidate, fullCandidate]);

  const filteredDrawerDocuments = useMemo(() => {
    if (drawerDocFilter === "All") return drawerCandidateDocuments;
    return drawerCandidateDocuments.filter(
      (d) =>
        (d.type || "Resume").toLowerCase() === drawerDocFilter.toLowerCase(),
    );
  }, [drawerCandidateDocuments, drawerDocFilter]);

  const handleDownloadDoc = async (
    docUrl: string,
    docName: string,
    appId?: string,
  ) => {
    const cleanName = fixUtf8String(docName || "document.pdf");
    const queryParams = new URLSearchParams();
    queryParams.set("url", docUrl);
    queryParams.set("name", cleanName);
    const queryString = `?${queryParams.toString()}`;

    const downloadPath = appId
      ? `/applications/${appId}/documents/download${queryString}`
      : candidate?.id
        ? `/candidates/${candidate.id}/documents/download${queryString}`
        : null;

    if (!downloadPath) {
      toast.error(t("errors.cannotDownloadDocument"));
      return;
    }

    await downloadAuthenticatedFile(downloadPath, cleanName);
  };

  const handleUploadDoc = async (file: File) => {
    if (!candidate) return;
    try {
      setIsUploadingDrawerDoc(true);
      await uploadCandidateDocMutation.mutateAsync({
        id: candidate.id,
        file,
        type: drawerDocFilter,
      });
    } catch (err) {
      console.error("Failed to upload document in drawer:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsUploadingDrawerDoc(false);
    }
  };

  const handleConfirmDeleteDrawerDoc = async () => {
    if (!drawerDocToDelete || !candidate) return;
    try {
      setIsDeletingDoc(true);
      if (drawerDocToDelete.sourceApplicationId) {
        await deleteAppDocMutation.mutateAsync({
          id: drawerDocToDelete.sourceApplicationId,
          documentId: drawerDocToDelete.id,
          url: drawerDocToDelete.url,
        });
      } else {
        await deleteCandidateDocMutation.mutateAsync({
          id: candidate.id,
          documentId: drawerDocToDelete.id,
          url: drawerDocToDelete.url,
        });
      }
      if (
        drawerPreviewDoc?.id === drawerDocToDelete.id ||
        drawerPreviewDoc?.url === drawerDocToDelete.url
      ) {
        setDrawerPreviewDoc(null);
      }
      setDrawerDocToDelete(null);
    } catch (err) {
      console.error("Failed to delete document in drawer:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleCancelInterview = async (
    app: Application,
    interviewOrId?: ScheduledInterviewInfo | string,
  ) => {
    try {
      let targetId: string | undefined;
      if (typeof interviewOrId === "string") {
        targetId = interviewOrId;
      } else if (
        interviewOrId &&
        typeof interviewOrId === "object" &&
        "id" in interviewOrId &&
        typeof interviewOrId.id === "string"
      ) {
        targetId = interviewOrId.id;
      } else {
        const interviews = getInterviewsFromApplication(app);
        targetId =
          interviews[0]?.id || (app.interviews && app.interviews[0]?.id);
      }

      if (targetId && typeof targetId === "string") {
        await deleteInterviewMutation.mutateAsync(targetId);
      }
    } catch (err) {
      console.error("Failed to cancel interview:", err);
      toast.error(getApiErrorMessage(err, t));
    }
  };

  return {
    drawerTab,
    setDrawerTab,
    drawerStageFilter,
    setDrawerStageFilter,
    drawerDocFilter,
    setDrawerDocFilter,
    drawerPreviewDoc,
    setDrawerPreviewDoc,
    drawerDocToDelete,
    setDrawerDocToDelete,
    isUploadingDrawerDoc,
    isDeletingDoc,
    selectedCandidateDetails,
    selectedCandidateApps,
    filteredDrawerApps,
    drawerCandidateDocuments,
    filteredDrawerDocuments,
    handleDownloadDoc,
    handleUploadDoc,
    handleConfirmDeleteDrawerDoc,
    handleCancelInterview,
  };
}
