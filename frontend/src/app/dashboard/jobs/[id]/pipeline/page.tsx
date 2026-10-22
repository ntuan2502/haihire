"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useJob,
  useJobApplications,
  useUpdateCandidateMutation,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Search, ArrowUpDown, Menu, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import type { ApplicationStage, CandidateDocument } from "@/types";
import {
  PIPELINE_STAGES,
  usePipelineStages,
  canTransition,
  getTransitionDisabledReason,
} from "@/lib/stages";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { downloadAuthenticatedFile } from "@/lib/api";
import { useI18n } from "@/i18n";
import {
  getCandidateDisplayName,
  parseCandidateDocuments,
  parseCandidateNotes,
  fixUtf8String,
} from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

// Extracted Sub-Components
import { PipelineStageSelector } from "@/components/jobs/pipeline/pipeline-stage-selector";
import { PipelineCandidateCard } from "@/components/jobs/pipeline/pipeline-candidate-card";
import { PipelineCandidateDetail } from "@/components/jobs/pipeline/pipeline-candidate-detail";

function JobPipelinePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { canEdit } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const pipelineStages = usePipelineStages();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: jobApplications = [], isLoading: appsLoading } =
    useJobApplications(jobId);

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();
  const updateCandidateMutation = useUpdateCandidateMutation();

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

  const [candidateNotesList, setCandidateNotesList] = useState<string[]>([]);
  const [candidateNoteInput, setCandidateNoteInput] = useState("");
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);

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

  const stageCounts = useMemo(() => {
    const counts: Record<ApplicationStage, number> = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      HIRED: 0,
      REJECTED: 0,
    };
    for (const app of jobApplications) {
      if (counts[app.stage] !== undefined) {
        counts[app.stage]++;
      }
    }
    return counts;
  }, [jobApplications]);

  const currentStageConfig = useMemo(() => {
    return (
      PIPELINE_STAGES.find((s) => s.id === selectedStage) || PIPELINE_STAGES[0]
    );
  }, [selectedStage]);

  const filteredCandidates = useMemo(() => {
    return jobApplications
      .filter((app) => app.stage === selectedStage)
      .filter((app) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          app.candidateName.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "score") {
          const scoreA = (a as unknown as { matchScore?: number }).matchScore;
          const scoreB = (b as unknown as { matchScore?: number }).matchScore;
          if (
            scoreA !== undefined &&
            scoreA !== null &&
            scoreB !== undefined &&
            scoreB !== null &&
            scoreA !== scoreB
          ) {
            return scoreB - scoreA;
          }
          if (
            (scoreA === undefined || scoreA === null) &&
            scoreB !== undefined &&
            scoreB !== null
          ) {
            return 1;
          }
          if (
            scoreA !== undefined &&
            scoreA !== null &&
            (scoreB === undefined || scoreB === null)
          ) {
            return -1;
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        if (sortBy === "newest") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        if (sortBy === "oldest") {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
        if (sortBy === "name") {
          return a.candidateName.localeCompare(b.candidateName);
        }
        return 0;
      });
  }, [jobApplications, selectedStage, searchQuery, sortBy]);

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

  const candidateDocuments = useMemo(() => {
    if (!selectedCandidate) return [];
    const seenUrls = new Set<string>();
    const allDocs: CandidateDocument[] = [];
    const relatedApps = jobApplications.filter(
      (a) =>
        a.candidateEmail &&
        a.candidateEmail === selectedCandidate.candidateEmail,
    );
    const appsToScan =
      relatedApps.length > 0 ? relatedApps : [selectedCandidate];

    for (const a of appsToScan) {
      const docs = parseCandidateDocuments(a.notes, {
        id: a.id,
        resumeUrl: a.resumeUrl,
        resumeFileName: a.resumeFileName,
        resumeFileSize: a.resumeFileSize,
        resumeMimeType: a.resumeMimeType,
        createdAt: a.createdAt,
      });
      for (const d of docs) {
        if (d.url && !seenUrls.has(d.url)) {
          seenUrls.add(d.url);
          allDocs.push(d);
        }
      }
    }
    return allDocs;
  }, [selectedCandidate, jobApplications]);

  useEffect(() => {
    if (selectedCandidate) {
      const parsed = parseCandidateNotes(
        selectedCandidate.notes,
        selectedCandidate.candidateName,
      );
      const noteText = parsed.customNotes || selectedCandidate.notes || "";
      const items = noteText
        ? noteText.split(/\s*\|\s*|\n+/).filter(Boolean)
        : [];
      setCandidateNotesList(items);
      setCandidateNoteInput("");
    } else {
      setCandidateNotesList([]);
    }
  }, [selectedCandidate]);

  const handleAddNote = async () => {
    if (!candidateNoteInput.trim() || !selectedCandidate) return;
    const trimmed = candidateNoteInput.trim();
    const updated = [...candidateNotesList, trimmed];
    setCandidateNotesList(updated);
    setCandidateNoteInput("");
    try {
      setIsUpdatingNote(true);
      await updateCandidateMutation.mutateAsync({
        id: selectedCandidate.id,
        data: {
          notes: updated.join(" | "),
        },
      });
    } catch (err) {
      console.error("Failed to save pipeline candidate note:", err);
    } finally {
      setIsUpdatingNote(false);
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

    // PART A (A3 Prevention): Enforce state machine transition check before calling API
    if (!canTransition(candidate.stage, newStage)) {
      const reason = getTransitionDisabledReason(candidate.stage, newStage, t);
      toast.error(reason);
      return;
    }

    try {
      await updateStageMutation.mutateAsync({
        id: candidate.id,
        stage: newStage,
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
      // PART B (B2 & B4 Defense in Depth): Pass all errors through getApiErrorMessage -> i18n
      const errorMsg = getApiErrorMessage(err, t);
      toast.error(errorMsg);
      // Refresh / sync Kanban queries
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
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
    const rawFileName = filename || "document.pdf";
    const downloadFileName = fixUtf8String(rawFileName);
    const queryParams = new URLSearchParams();
    if (url) queryParams.set("url", url);
    if (downloadFileName) queryParams.set("name", downloadFileName);
    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    const activeAppId = targetAppId || selectedCandidate?.id;
    if (!activeAppId) {
      toast.error(t("errors.cannotDownloadDocument"));
      return;
    }
    const downloadPath = `/applications/${activeAppId}/documents/download${queryString}`;

    try {
      await downloadAuthenticatedFile(downloadPath, downloadFileName);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  if (jobLoading || appsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) return null;

  const candidateCountText =
    filteredCandidates.length === 0
      ? `${t("common.showing")} 0-0 ${t("common.of")} 0 ${t("nav.candidates").toLowerCase()}`
      : `${t("common.showing")} 1-${filteredCandidates.length} ${t("common.of")} ${filteredCandidates.length} ${t("nav.candidates").toLowerCase()}`;

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-slate-950" : ""
      }`}
    >
      {/* 1. Pipeline Stages Sub-header */}
      <PipelineStageSelector
        stages={pipelineStages}
        stageCounts={stageCounts}
        selectedStage={selectedStage}
        onSelectStage={handleSelectStage}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        isListCollapsed={isListCollapsed}
        onToggleCollapse={() => setIsListCollapsed((prev) => !prev)}
        onDropCandidate={handleDropCandidate}
      />

      {/* 2. Main Master-Detail Workspace */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT COLUMN: Candidates List */}
        <aside
          className={`w-full ${isListCollapsed ? "md:w-0 md:hidden" : "md:w-80 lg:w-84"} shrink-0 flex flex-col h-full border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200 ${
            mobileDetailOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search box & Toolbar */}
          <div className="shrink-0 p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <Input
                type="text"
                name="candidates-search"
                placeholder={t("candidates.searchCandidates")}
                aria-label={t("candidates.searchCandidates")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            {/* Sort toolbar */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <CustomSelect
                value={sortBy}
                onChange={(val) =>
                  setSortBy(val as "score" | "newest" | "oldest" | "name")
                }
                size="sm"
                icon={ArrowUpDown}
                options={[
                  { value: "score", label: t("applications.columns.score") },
                  { value: "newest", label: t("candidates.columns.added") },
                  { value: "oldest", label: t("common.created") },
                  { value: "name", label: t("candidates.candidateName") },
                ]}
                className="w-auto"
                triggerClassName="h-7 text-xs py-1 px-2.5 font-semibold"
              />

              <button
                type="button"
                disabled
                className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 opacity-40 cursor-not-allowed transition-colors"
                title="Filter options"
              >
                <Menu className="h-3 w-3" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-medium pt-0.5">
              {candidateCountText}
            </p>
          </div>

          {/* Candidates List Container */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
            {filteredCandidates.length === 0 ? (
              <div className="pt-8 pb-6 px-4 flex flex-col items-center text-center space-y-2 text-slate-400">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t("candidates.noCandidatesYet")}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {t("candidates.noApplicationsMatchingStage")}
                  </p>
                </div>
              </div>
            ) : (
              filteredCandidates.map((candidate) => (
                <PipelineCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isSelected={
                    String(candidate.id) === String(selectedAppId) ||
                    String(candidate.candidateId) === String(selectedAppId)
                  }
                  onSelect={() => {
                    handleSelectCandidate(candidate.id);
                  }}
                  canDrag={canEdit}
                />
              ))
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Candidate Detail Content */}
        <PipelineCandidateDetail
          selectedCandidate={selectedCandidate}
          currentStageConfig={currentStageConfig}
          mobileDetailOpen={mobileDetailOpen}
          onCloseMobileDetail={() => setMobileDetailOpen(false)}
          job={job}
          canEdit={canEdit}
          isMovingStage={updateStageMutation.isPending}
          onMoveStage={handleMoveCandidateStage}
          currentIndex={currentIndex}
          totalCandidates={filteredCandidates.length}
          onPrevCandidate={handlePrevCandidate}
          onNextCandidate={handleNextCandidate}
          candidateTab={candidateTab}
          onSelectTab={setCandidateTab}
          overviewSections={overviewSections}
          onToggleOverviewSection={handleToggleOverviewSection}
          isOverviewPopoverOpen={isOverviewPopoverOpen}
          onToggleOverviewPopover={() =>
            setIsOverviewPopoverOpen((prev) => !prev)
          }
          onCloseOverviewPopover={() => setIsOverviewPopoverOpen(false)}
          overviewBtnRef={overviewBtnRef}
          candidateDocuments={candidateDocuments}
          onPreviewDoc={(doc) => setPreviewDoc(doc)}
          onDownloadDoc={handleDownloadDoc}
          candidateInterviews={selectedCandidate?.interviews || []}
          onScheduleInterview={(intv) => {
            setEditingInterview(intv || null);
            setScheduleModalOpen(true);
          }}
          candidateNotesList={candidateNotesList}
          candidateNoteInput={candidateNoteInput}
          onChangeNoteInput={setCandidateNoteInput}
          onAddNote={handleAddNote}
          isUpdatingNote={isUpdatingNote}
          onDeleteApplication={() => setDeleteAppModalOpen(true)}
        />
      </main>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        appId={selectedCandidate?.id}
        onDownload={handleDownloadDoc}
      />

      {/* Delete Application Confirmation Modal */}
      {selectedCandidate && (
        <DeleteApplicationModal
          isOpen={deleteAppModalOpen}
          onClose={() => setDeleteAppModalOpen(false)}
          onConfirm={handleConfirmDeleteCandidate}
          candidateName={getCandidateDisplayName(selectedCandidate)}
          jobTitle={job.title}
          isDeleting={isDeletingApp}
        />
      )}

      {/* Schedule Interview Modal */}
      {job && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            setEditingInterview(null);
          }}
          jobs={[job]}
          applications={jobApplications}
          selectedJobId={job.id}
          selectedApplicationId={selectedCandidate?.id}
          editingInterview={editingInterview}
        />
      )}
    </div>
  );
}

export default function JobPipelinePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobPipelinePageContent />
    </Suspense>
  );
}
