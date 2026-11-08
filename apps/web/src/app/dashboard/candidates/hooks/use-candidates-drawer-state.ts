"use client";

import { useState, useMemo } from "react";
import { useCandidate, useDeleteCandidateMutation } from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import type { CandidateItem } from "@/lib/utils";
import type { Application } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

export function useCandidatesDrawerState() {
  const { t } = useI18n();

  // Slide-over candidate profile drawer state
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateItem | null>(null);
  const { data: selectedCandidateFull } = useCandidate(selectedCandidate?.id);

  // Sub-modal states
  const [applyToJobModalCandidate, setApplyToJobModalCandidate] =
    useState<CandidateItem | null>(null);
  const [scheduleInterviewApp, setScheduleInterviewApp] =
    useState<Application | null>(null);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);

  // Candidate deletion state and mutation
  const deleteCandidateMutation = useDeleteCandidateMutation();
  const [candidateToDelete, setCandidateToDelete] =
    useState<CandidateItem | null>(null);

  // Filter drawer open state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleConfirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteCandidateMutation.mutateAsync(candidateToDelete.id);
      setCandidateToDelete(null);
    } catch (err) {
      console.error("Failed to delete candidate:", err);
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const selectedCandidateApps = useMemo(() => {
    if (!selectedCandidate) return [];
    return (selectedCandidateFull?.applications ||
      selectedCandidate.candidate?.applications ||
      []) as Application[];
  }, [selectedCandidate, selectedCandidateFull]);

  return {
    selectedCandidate,
    setSelectedCandidate,
    selectedCandidateFull,
    applyToJobModalCandidate,
    setApplyToJobModalCandidate,
    scheduleInterviewApp,
    setScheduleInterviewApp,
    editingInterview,
    setEditingInterview,
    candidateToDelete,
    setCandidateToDelete,
    deleteCandidateMutation,
    handleConfirmDeleteCandidate,
    isFilterOpen,
    setIsFilterOpen,
    selectedCandidateApps,
  };
}
