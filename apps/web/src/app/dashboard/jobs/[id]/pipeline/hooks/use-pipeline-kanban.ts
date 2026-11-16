"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useJob,
  useJobApplications,
  useJobStages,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import type { Application, ApplicationStage, CandidateDocument } from "@/types";
import type { RejectApplicationConfirmPayload } from "@/components/applications/reject-application-modal";
import type { OfferApplicationConfirmPayload } from "@/components/applications/offer-application-modal";
import {
  PIPELINE_STAGES,
  usePipelineStages,
  canTransition,
  getTransitionDisabledReason,
} from "@/lib/stages";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { useI18n } from "@/i18n";
import { useAuth } from "@/context/auth-context";
import {
  collectPipelineCandidateDocuments,
  computePipelineStageCounts,
  downloadPipelineCandidateDocument,
  filterAndSortPipelineApplications,
} from "./pipeline-kanban.helpers";

export function usePipelineKanban(jobId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEdit } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: customJobStages } = useJobStages(jobId);
  const pipelineStages = usePipelineStages(customJobStages);
  const { data: jobApplications = [], isLoading: appsLoading } =
    useJobApplications(jobId);

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();

  const initialStageParam = searchParams.get(
    "stage",
  ) as ApplicationStage | null;

  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(() => {
    if (
      initialStageParam &&
      PIPELINE_STAGES.some((s) => s.id === initialStageParam)
    ) {
      return initialStageParam;
    }
    return "APPLIED";
  });

  useEffect(() => {
    const stageParam = searchParams.get("stage") as ApplicationStage | null;
    if (stageParam && PIPELINE_STAGES.some((s) => s.id === stageParam)) {
      setSelectedStage(stageParam);
    }
  }, [searchParams]);

  const initialTargetAppId =
    searchParams.get("applicationId") || searchParams.get("candidateId");
  const handledTargetAppIdRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">(
    "newest",
  );
  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    () => initialTargetAppId || null,
  );
  const [candidateTab, setCandidateTab] = useState<string>("overview");

  const [overviewSections, setOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isOverviewPopoverOpen, setIsOverviewPopoverOpen] = useState(false);
  const overviewBtnRef = useRef<HTMLButtonElement>(null);

  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);
  const [deleteAppModalOpen, setDeleteAppModalOpen] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);

  useEffect(() => {
    const targetId =
      searchParams.get("applicationId") || searchParams.get("candidateId");
    if (!targetId || jobApplications.length === 0) return;
    if (handledTargetAppIdRef.current === targetId) return;

    const targetApp = jobApplications.find(
      (app) =>
        String(app.id) === String(targetId) ||
        String(app.candidateId) === String(targetId),
    );

    if (targetApp) {
      handledTargetAppIdRef.current = targetId;
      if (targetApp.stage !== selectedStage) {
        setSelectedStage(targetApp.stage);
      }
      setSelectedAppId(targetApp.id);
      setMobileDetailOpen(true);

      setTimeout(() => {
        const el =
          document.getElementById(`candidate-card-${targetApp.id}`) ||
          document.getElementById(`candidate-card-${targetApp.candidateId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 150);
    }
  }, [searchParams, jobApplications, selectedStage]);

  const handleSelectCandidate = useCallback(
    (candidateId: string) => {
      setSelectedAppId(candidateId);
      setMobileDetailOpen(true);
      if (typeof window !== "undefined") {
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("stage", selectedStage);
        newParams.set("applicationId", candidateId);
        newParams.delete("candidateId");
        window.history.replaceState(
          null,
          "",
          `/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`,
        );
      }
    },
    [selectedStage, jobId],
  );

  const handleSelectStage = (stage: ApplicationStage) => {
    setSelectedStage(stage);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("stage", stage);
    newParams.delete("applicationId");
    newParams.delete("candidateId");
    router.replace(
      `/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`,
      {
        scroll: false,
      },
    );
    setMobileDetailOpen(false);
  };

  const handleToggleOverviewSection = (key: keyof OverviewSectionsState) => {
    setOverviewSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const stageCounts = useMemo(
    () => computePipelineStageCounts(jobApplications),
    [jobApplications],
  );

  const currentStageConfig = useMemo(() => {
    return (
      pipelineStages.find((s) => s.id === selectedStage) || pipelineStages[0]
    );
  }, [pipelineStages, selectedStage]);

  const filteredCandidates = useMemo(
    () =>
      filterAndSortPipelineApplications(
        jobApplications,
        selectedStage,
        searchQuery,
        sortBy,
      ),
    [jobApplications, selectedStage, searchQuery, sortBy],
  );

  useEffect(() => {
    if (appsLoading) return;

    const targetId =
      searchParams.get("applicationId") || searchParams.get("candidateId");
    if (targetId && handledTargetAppIdRef.current !== targetId) return;

    if (filteredCandidates.length > 0) {
      const isSelectedInList = filteredCandidates.some(
        (c) =>
          String(c.id) === String(selectedAppId) ||
          String(c.candidateId) === String(selectedAppId),
      );
      if (!selectedAppId || !isSelectedInList) {
        const nextId = filteredCandidates[0].id;
        setSelectedAppId(nextId);
        if (typeof window !== "undefined") {
          const newParams = new URLSearchParams(window.location.search);
          newParams.set("stage", selectedStage);
          newParams.set("applicationId", nextId);
          newParams.delete("candidateId");
          window.history.replaceState(
            null,
            "",
            `/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`,
          );
        }
      }
    } else {
      setSelectedAppId(null);
    }
  }, [
    appsLoading,
    searchParams,
    filteredCandidates,
    selectedAppId,
    selectedStage,
    jobId,
  ]);

  const selectedCandidate = useMemo(() => {
    return (
      filteredCandidates.find(
        (c) =>
          String(c.id) === String(selectedAppId) ||
          String(c.candidateId) === String(selectedAppId),
      ) ||
      jobApplications.find(
        (c) =>
          String(c.id) === String(selectedAppId) ||
          String(c.candidateId) === String(selectedAppId),
      ) ||
      filteredCandidates[0] ||
      null
    );
  }, [filteredCandidates, jobApplications, selectedAppId]);

  const currentIndex = useMemo(() => {
    if (!selectedCandidate) return -1;
    return filteredCandidates.findIndex(
      (c) => String(c.id) === String(selectedCandidate.id),
    );
  }, [filteredCandidates, selectedCandidate]);

  const handlePrevCandidate = () => {
    if (currentIndex > 0) {
      handleSelectCandidate(filteredCandidates[currentIndex - 1].id);
    }
  };

  const handleNextCandidate = () => {
    if (currentIndex >= 0 && currentIndex < filteredCandidates.length - 1) {
      handleSelectCandidate(filteredCandidates[currentIndex + 1].id);
    }
  };

  const candidateDocuments = useMemo(
    () => collectPipelineCandidateDocuments(selectedCandidate, jobApplications),
    [selectedCandidate, jobApplications],
  );

  const [pendingRejectCandidate, setPendingRejectCandidate] =
    useState<Application | null>(null);
  const [pendingOfferCandidate, setPendingOfferCandidate] =
    useState<Application | null>(null);

  const executeMoveCandidateStage = async (
    candidate: Application,
    newStage: ApplicationStage,
    options?: Partial<
      RejectApplicationConfirmPayload & OfferApplicationConfirmPayload
    >,
  ) => {
    try {
      const matchedStage = pipelineStages.find((s) => s.id === newStage);
      await updateStageMutation.mutateAsync({
        id: candidate.id,
        stage: newStage,
        ...(matchedStage?.stageId ? { stageId: matchedStage.stageId } : {}),
        ...(options?.rejectionReason !== undefined
          ? { rejectionReason: options.rejectionReason }
          : {}),
        ...(options?.sendRejectionEmail !== undefined
          ? { sendRejectionEmail: options.sendRejectionEmail }
          : {}),
        ...(options?.sendOfferEmail !== undefined
          ? { sendOfferEmail: options.sendOfferEmail }
          : {}),
        ...(options?.emailTemplateId
          ? { emailTemplateId: options.emailTemplateId }
          : {}),
      });
      setSelectedStage(newStage);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("stage", newStage);
      newParams.set("applicationId", candidate.id);
      router.replace(
        `/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`,
        {
          scroll: false,
        },
      );
    } catch (err) {
      console.error("Failed to move candidate stage", err);
      const errorMsg = getApiErrorMessage(err, t);
      toast.error(errorMsg);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
    }
  };

  const handleMoveCandidateStage = async (
    newStage: ApplicationStage,
    overrideCandidateId?: string,
  ) => {
    const activeAppId = overrideCandidateId || selectedCandidate?.id;
    const candidate =
      jobApplications.find((a) => a.id === activeAppId) || selectedCandidate;
    if (!candidate) return;

    if (!canTransition(candidate.stage, newStage)) {
      const reason = getTransitionDisabledReason(candidate.stage, newStage, t);
      toast.error(reason);
      return;
    }

    if (newStage === "REJECTED" && candidate.stage !== "REJECTED") {
      setPendingRejectCandidate(candidate);
      return;
    }

    if (newStage === "OFFER" && candidate.stage !== "OFFER") {
      setPendingOfferCandidate(candidate);
      return;
    }

    await executeMoveCandidateStage(candidate, newStage);
  };

  const handleConfirmRejectCandidate = async (
    payload: RejectApplicationConfirmPayload,
  ) => {
    if (!pendingRejectCandidate) return;
    const target = pendingRejectCandidate;
    try {
      await executeMoveCandidateStage(target, "REJECTED", payload);
      setPendingRejectCandidate(null);
    } catch {
      // Error already surfaced via executeMoveCandidateStage
    }
  };

  const handleConfirmOfferCandidate = async (
    payload: OfferApplicationConfirmPayload,
  ) => {
    if (!pendingOfferCandidate) return;
    const target = pendingOfferCandidate;
    try {
      await executeMoveCandidateStage(target, "OFFER", payload);
      setPendingOfferCandidate(null);
    } catch {
      // Error already surfaced via executeMoveCandidateStage
    }
  };

  const handleDropCandidate = (
    candidateId: string,
    fromStage: ApplicationStage,
    toStage: ApplicationStage,
  ) => {
    if (fromStage === toStage) return;
    if (!canTransition(fromStage, toStage)) {
      const reason = getTransitionDisabledReason(fromStage, toStage, t);
      toast.error(reason);
      return;
    }
    handleMoveCandidateStage(toStage, candidateId);
  };

  const handleConfirmDeleteCandidate = async () => {
    if (!selectedCandidate) return;
    try {
      setIsDeletingApp(true);
      await deleteAppMutation.mutateAsync(selectedCandidate.id);
      setDeleteAppModalOpen(false);
      setSelectedAppId(null);
      setMobileDetailOpen(false);
    } catch (err) {
      console.error("Failed to delete candidate application:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsDeletingApp(false);
    }
  };

  const handleDownloadDoc = async (
    url: string,
    filename?: string,
    targetAppId?: string,
  ) => {
    await downloadPipelineCandidateDocument(
      url,
      filename,
      targetAppId || selectedCandidate?.id,
      () => toast.error(t("errors.cannotDownloadDocument")),
      (err) => toast.error(getApiErrorMessage(err, t)),
    );
  };

  const candidateCountText =
    filteredCandidates.length === 0
      ? `${t("common.showing")} 0-0 ${t("common.of")} 0 ${t("nav.candidates").toLowerCase()}`
      : `${t("common.showing")} 1-${filteredCandidates.length} ${t("common.of")} ${filteredCandidates.length} ${t("nav.candidates").toLowerCase()}`;

  return {
    job,
    jobApplications,
    jobLoading,
    appsLoading,
    canEdit,
    pipelineStages,
    selectedStage,
    handleSelectStage,
    stageCounts,
    currentStageConfig,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filteredCandidates,
    selectedAppId,
    handleSelectCandidate,
    selectedCandidate,
    currentIndex,
    handlePrevCandidate,
    handleNextCandidate,
    candidateDocuments,
    previewDoc,
    setPreviewDoc,
    handleDownloadDoc,
    isMovingStage: updateStageMutation.isPending,
    handleMoveCandidateStage,
    handleDropCandidate,
    pendingRejectCandidate,
    setPendingRejectCandidate,
    handleConfirmRejectCandidate,
    pendingOfferCandidate,
    setPendingOfferCandidate,
    handleConfirmOfferCandidate,
    deleteAppModalOpen,
    setDeleteAppModalOpen,
    isDeletingApp,
    handleConfirmDeleteCandidate,
    scheduleModalOpen,
    setScheduleModalOpen,
    editingInterview,
    setEditingInterview,
    isFullscreen,
    setIsFullscreen,
    isListCollapsed,
    setIsListCollapsed,
    mobileDetailOpen,
    setMobileDetailOpen,
    candidateTab,
    setCandidateTab,
    overviewSections,
    handleToggleOverviewSection,
    isOverviewPopoverOpen,
    setIsOverviewPopoverOpen,
    overviewBtnRef,
    candidateCountText,
  };
}
