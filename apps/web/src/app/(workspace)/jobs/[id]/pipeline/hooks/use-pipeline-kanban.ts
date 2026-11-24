"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const updatePipelineUrl = useCallback(
    (
      updates: Record<string, string | null | undefined>,
      useRouterReplace = false,
    ) => {
      const baseQuery =
        typeof window !== "undefined"
          ? window.location.search
          : searchParams.toString();
      const newParams = new URLSearchParams(baseQuery);
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, val);
        }
      }
      const queryString = newParams.toString();
      const nextUrl = queryString
        ? `/jobs/${jobId}/pipeline?${queryString}`
        : `/jobs/${jobId}/pipeline`;

      if (useRouterReplace) {
        router.replace(nextUrl, { scroll: false });
      } else if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextUrl);
      }
    },
    [jobId, router, searchParams],
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
  const handledTargetAppIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    const stageParam = searchParams.get("stage") as ApplicationStage | null;
    if (stageParam && PIPELINE_STAGES.some((s) => s.id === stageParam)) {
      setSelectedStage(stageParam);
    }
    const urlSearch = searchParams.get("search") || "";
    setSearchQueryState((prev) =>
      prev.trim() === urlSearch ? prev : urlSearch,
    );
    setSortByState(parseSortByParam(searchParams.get("sortBy")));
    setCandidateTabState(parseCandidateTabParam(searchParams.get("tab")));
  }, [searchParams]);

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
    setSelectedStage(stage);
    setIsSendEmailOpen(false);
    updatePipelineUrl(
      {
        stage,
        applicationId: null,
        candidateId: null,
      },
      true,
    );
    setMobileDetailOpen(false);
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
    if (appsLoading || updateStageMutation.isPending) return;

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
        updatePipelineUrl({
          stage: selectedStage,
          applicationId: nextId,
          candidateId: null,
        });
      }
    } else {
      setSelectedAppId(null);
      updatePipelineUrl({
        stage: selectedStage,
        applicationId: null,
        candidateId: null,
      });
    }
  }, [
    appsLoading,
    updateStageMutation.isPending,
    searchParams,
    filteredCandidates,
    selectedAppId,
    selectedStage,
    updatePipelineUrl,
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
      setSelectedAppId(candidate.id);
      setSelectedStage(newStage);
      updatePipelineUrl(
        {
          stage: newStage,
          applicationId: candidate.id,
          candidateId: null,
        },
        true,
      );
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
