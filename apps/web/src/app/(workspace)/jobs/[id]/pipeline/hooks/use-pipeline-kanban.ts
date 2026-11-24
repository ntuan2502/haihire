"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  useJob,
  useJobApplications,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
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
import { queryKeys } from "@/hooks/query-keys";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  collectPipelineCandidateDocuments,
  computePipelineStageCounts,
  downloadPipelineCandidateDocument,
  filterAndSortPipelineApplications,
} from "./pipeline-kanban.helpers";

const VALID_SORT_BY = ["score", "newest", "oldest", "name"] as const;
type PipelineSortBy = (typeof VALID_SORT_BY)[number];

const VALID_CANDIDATE_TABS = [
  "overview",
  "interviews",
  "documents",
  "notes",
  "timeline",
] as const;

function parseSortByParam(value: string | null): PipelineSortBy {
  return VALID_SORT_BY.includes(value as PipelineSortBy)
    ? (value as PipelineSortBy)
    : "newest";
}

function parseCandidateTabParam(value: string | null): string {
  return value && (VALID_CANDIDATE_TABS as readonly string[]).includes(value)
    ? value
    : "overview";
}

export function usePipelineKanban(jobId: string) {
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { user } = useAuth();
  const canEdit = useHasPermission("application:update_stage");
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const pipelineStages = usePipelineStages();
  const { data: jobApplications = [], isLoading: appsLoading } =
    useJobApplications(jobId);

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();
  const deleteInterviewMutation = useDeleteInterviewMutation();

  const handledTargetAppIdRef = useRef<string | null>(null);
  const lastSyncedSearchRef = useRef<string>(searchParamsString);
  const selfWrittenSearchesRef = useRef<Set<string>>(new Set());

  const updatePipelineUrl = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      if (typeof window === "undefined") return;
      const newParams = new URLSearchParams(window.location.search);
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, val);
        }
      }
      const queryString = newParams.toString();
      lastSyncedSearchRef.current = queryString;
      const nextUrl = queryString
        ? `/jobs/${jobId}/pipeline?${queryString}`
        : `/jobs/${jobId}/pipeline`;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl === currentUrl) return;
      selfWrittenSearchesRef.current.add(queryString);
      window.history.replaceState(null, "", nextUrl);
    },
    [jobId],
  );

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

  const initialTargetAppId =
    searchParams.get("applicationId") || searchParams.get("candidateId");

  const [searchQuery, setSearchQueryState] = useState(
    () => searchParams.get("search") || "",
  );
  const [sortBy, setSortByState] = useState<PipelineSortBy>(() =>
    parseSortByParam(searchParams.get("sortBy")),
  );
  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    () => initialTargetAppId || null,
  );
  const [candidateTab, setCandidateTabState] = useState<string>(() =>
    parseCandidateTabParam(searchParams.get("tab")),
  );

  // Sync only when Next.js searchParams string genuinely changes externally
  useEffect(() => {
    if (lastSyncedSearchRef.current === searchParamsString) {
      selfWrittenSearchesRef.current.clear();
      return;
    }
    if (selfWrittenSearchesRef.current.has(searchParamsString)) {
      selfWrittenSearchesRef.current.delete(searchParamsString);
      return;
    }
    lastSyncedSearchRef.current = searchParamsString;
    const paramsSnapshot = new URLSearchParams(searchParamsString);
    const stageParam = paramsSnapshot.get("stage") as ApplicationStage | null;
    if (stageParam && PIPELINE_STAGES.some((s) => s.id === stageParam)) {
      setSelectedStage(stageParam);
    }
    const urlSearch = paramsSnapshot.get("search") || "";
    setSearchQueryState((prev) =>
      prev.trim() === urlSearch ? prev : urlSearch,
    );
    setSortByState(parseSortByParam(paramsSnapshot.get("sortBy")));
    setCandidateTabState(parseCandidateTabParam(paramsSnapshot.get("tab")));
  }, [searchParamsString]);

  const setSearchQuery = useCallback(
    (value: string) => {
      setSearchQueryState(value);
      updatePipelineUrl({ search: value.trim() || null });
    },
    [updatePipelineUrl],
  );

  const setSortBy = useCallback(
    (value: PipelineSortBy) => {
      setSortByState(value);
      updatePipelineUrl({ sortBy: value === "newest" ? null : value });
    },
    [updatePipelineUrl],
  );

  const setCandidateTab = useCallback(
    (value: string) => {
      const normalized = parseCandidateTabParam(value);
      setCandidateTabState(normalized);
      updatePipelineUrl({
        tab: normalized === "overview" ? null : normalized,
      });
    },
    [updatePipelineUrl],
  );

  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);
  const [deleteAppModalOpen, setDeleteAppModalOpen] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);

  // One-shot deep-link resolution when arriving with applicationId / candidateId
  useEffect(() => {
    if (
      selfWrittenSearchesRef.current.size > 0 &&
      lastSyncedSearchRef.current !== searchParamsString
    ) {
      return;
    }
    const paramsSnapshot = new URLSearchParams(searchParamsString);
    const targetId =
      paramsSnapshot.get("applicationId") || paramsSnapshot.get("candidateId");
    if (!targetId || jobApplications.length === 0) return;
    if (handledTargetAppIdRef.current === targetId) return;

    const targetApp = jobApplications.find(
      (app) =>
        String(app.id) === String(targetId) ||
        String(app.candidateId) === String(targetId),
    );

    if (targetApp) {
      handledTargetAppIdRef.current = targetId;
      setSelectedStage((prev) =>
        prev === targetApp.stage ? prev : targetApp.stage,
      );
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
  }, [searchParamsString, jobApplications]);

  const handleSelectCandidate = useCallback(
    (candidateId: string) => {
      handledTargetAppIdRef.current = candidateId;
      setSelectedAppId(candidateId);
      setMobileDetailOpen(true);
      setIsSendEmailOpen(false);
      updatePipelineUrl({
        stage: selectedStage,
        applicationId: candidateId,
        candidateId: null,
      });
    },
    [selectedStage, updatePipelineUrl],
  );

  const handleSelectStage = (stage: ApplicationStage) => {
    const nextCandidates = filterAndSortPipelineApplications(
      jobApplications,
      stage,
      searchQuery,
      sortBy,
    );
    const nextAppId = nextCandidates[0]?.id ?? null;
    handledTargetAppIdRef.current = nextAppId;
    setSelectedStage(stage);
    setSelectedAppId(nextAppId);
    setIsSendEmailOpen(false);
    setMobileDetailOpen(false);
    updatePipelineUrl({
      stage,
      applicationId: nextAppId,
      candidateId: null,
    });
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

  // Reconcile selected candidate when list changes (e.g. initial load, search, deletion)
  useEffect(() => {
    if (appsLoading || updateStageMutation.isPending) return;

    const paramsSnapshot = new URLSearchParams(searchParamsString);
    const targetId =
      paramsSnapshot.get("applicationId") || paramsSnapshot.get("candidateId");
    const isPendingSelfFlush =
      selfWrittenSearchesRef.current.size > 0 &&
      lastSyncedSearchRef.current !== searchParamsString;
    if (
      !isPendingSelfFlush &&
      targetId &&
      handledTargetAppIdRef.current !== targetId
    ) {
      return;
    }

    if (filteredCandidates.length > 0) {
      const isSelectedInList = filteredCandidates.some(
        (c) =>
          String(c.id) === String(selectedAppId) ||
          String(c.candidateId) === String(selectedAppId),
      );
      if (!selectedAppId || !isSelectedInList) {
        const nextId = filteredCandidates[0].id;
        handledTargetAppIdRef.current = nextId;
        setSelectedAppId(nextId);
        updatePipelineUrl({
          stage: selectedStage,
          applicationId: nextId,
          candidateId: null,
        });
      }
    } else {
      if (selectedAppId !== null) {
        handledTargetAppIdRef.current = null;
        setSelectedAppId(null);
      }
      const browserParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : paramsSnapshot;
      if (
        browserParams.has("applicationId") ||
        browserParams.has("candidateId") ||
        browserParams.get("stage") !== selectedStage
      ) {
        updatePipelineUrl({
          stage: selectedStage,
          applicationId: null,
          candidateId: null,
        });
      }
    }
  }, [
    appsLoading,
    updateStageMutation.isPending,
    searchParamsString,
    filteredCandidates,
    selectedAppId,
    selectedStage,
    updatePipelineUrl,
  ]);

  const selectedCandidate = useMemo(() => {
    if (filteredCandidates.length === 0) return null;
    return (
      filteredCandidates.find(
        (c) =>
          String(c.id) === String(selectedAppId) ||
          String(c.candidateId) === String(selectedAppId),
      ) ||
      filteredCandidates[0] ||
      null
    );
  }, [filteredCandidates, selectedAppId]);

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
  ): Promise<boolean> => {
    try {
      await updateStageMutation.mutateAsync({
        id: candidate.id,
        stage: newStage,
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
      queryClient.setQueriesData<Application[]>(
        { queryKey: queryKeys.applications(jobId, user?.organizationId) },
        (prev) =>
          Array.isArray(prev)
            ? prev.map((item) =>
                String(item.id) === String(candidate.id)
                  ? { ...item, stage: newStage }
                  : item,
              )
            : prev,
      );
      handledTargetAppIdRef.current = candidate.id;
      setSelectedAppId(candidate.id);
      setSelectedStage(newStage);
      updatePipelineUrl({
        stage: newStage,
        applicationId: candidate.id,
        candidateId: null,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["applications"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.applications(jobId, user?.organizationId),
        }),
      ]);
      return true;
    } catch (err) {
      console.error("Failed to move candidate stage", err);
      const errorMsg = getApiErrorMessage(err, t);
      toast.error(errorMsg);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications(jobId, user?.organizationId),
      });
      return false;
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
    const ok = await executeMoveCandidateStage(
      pendingRejectCandidate,
      "REJECTED",
      payload,
    );
    if (ok) {
      setPendingRejectCandidate(null);
    }
  };

  const handleConfirmOfferCandidate = async (
    payload: OfferApplicationConfirmPayload,
  ) => {
    if (!pendingOfferCandidate) return;
    const ok = await executeMoveCandidateStage(
      pendingOfferCandidate,
      "OFFER",
      payload,
    );
    if (ok) {
      setPendingOfferCandidate(null);
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

  const handleCancelInterview = async (
    interviewOrId?: ScheduledInterviewInfo | string,
  ) => {
    if (!selectedCandidate) return;
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
      } else if (
        selectedCandidate.interviews &&
        selectedCandidate.interviews.length > 0 &&
        selectedCandidate.interviews[0]?.id
      ) {
        targetId = selectedCandidate.interviews[0].id;
      }

      if (targetId && typeof targetId === "string") {
        await deleteInterviewMutation.mutateAsync(targetId);
      }
    } catch (err) {
      console.error("Failed to cancel interview:", err);
      toast.error(getApiErrorMessage(err, t));
    }
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
    handleCancelInterview,
    isSendEmailOpen,
    setIsSendEmailOpen,
    mobileDetailOpen,
    setMobileDetailOpen,
    candidateTab,
    setCandidateTab,
    candidateCountText,
  };
}
