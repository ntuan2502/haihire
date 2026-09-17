"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useJob,
  useAllApplications,
  useUpdateCandidateMutation,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Search,
  ArrowUpDown,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Maximize2,
  Minimize2,
  Menu,
  FileCheck,
  SlidersHorizontal,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import {
  removeInterviewFromNotes,
} from "@/lib/interviews";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import type { ApplicationStage, CandidateDocument } from "@/types";
import { PIPELINE_STAGES, usePipelineStages } from "@/lib/stages";
import { StageBadge } from "@/components/shared/stage-badge";
import { getApiBaseUrl } from "@/lib/api";
import { useI18n } from "@/i18n";
import {
  getInitials,
  formatRelativeTime,
  formatDate,
  getCandidateDisplayName,
  parseCandidateDocuments,
  parseCandidateNotes,
  fixUtf8String,
} from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

function JobPipelinePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { canEdit } = useAuth();
  const { t } = useI18n();
  const pipelineStages = usePipelineStages();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: allApplications = [], isLoading: appsLoading } =
    useAllApplications();

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();

  const initialStageParam = searchParams.get("stage") as ApplicationStage | null;

  // Selected stage filter for candidate pipeline (supports URL ?stage=...)
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(() => {
    if (
      initialStageParam &&
      PIPELINE_STAGES.some((s) => s.id === initialStageParam)
    ) {
      return initialStageParam;
    }
    return "APPLIED";
  });

  // Sync selectedStage if URL stage param changes
  useEffect(() => {
    const stageParam = searchParams.get("stage") as ApplicationStage | null;
    if (stageParam && PIPELINE_STAGES.some((s) => s.id === stageParam)) {
      setSelectedStage(stageParam);
    }
  }, [searchParams]);

  const handleSelectStage = (stageId: ApplicationStage) => {
    setSelectedStage(stageId);
    setCandidateTab("overview");
    setMobileDetailOpen(false);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("stage", stageId);
    router.replace(`/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`, {
      scroll: false,
    });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">(
    "score",
  );

  // Selected candidate in master-detail view
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Candidate detail sub-navigation tab
  const [candidateTab, setCandidateTab] = useState<string>("overview");

  // Candidate overview section visibility state
  const [overviewSections, setOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isOverviewPopoverOpen, setIsOverviewPopoverOpen] = useState(false);
  const overviewBtnRef = useRef<HTMLButtonElement>(null);

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);
  const [deleteAppModalOpen, setDeleteAppModalOpen] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const updateCandidateMutation = useUpdateCandidateMutation();

  // Cancel scheduled interview
  const handleCancelInterview = async () => {
    if (!selectedCandidate) return;
    try {
      const updatedNotes = removeInterviewFromNotes(selectedCandidate.notes);
      await updateCandidateMutation.mutateAsync({
        id: selectedCandidate.id,
        data: {
          notes: updatedNotes,
        },
      });
    } catch (err) {
      console.error("Failed to cancel interview:", err);
    }
  };

  // Candidate notes input
  const [candidateNotesList, setCandidateNotesList] = useState<string[]>([]);
  const [candidateNoteInput, setCandidateNoteInput] = useState("");

  // Filter applications belonging to this job
  const jobApplications = useMemo(() => {
    if (!jobId) return [];
    return allApplications.filter((a) => String(a.jobId) === String(jobId));
  }, [allApplications, jobId]);

  // Stage counts for this job
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

  // Current stage info
  const currentStageConfig = useMemo(() => {
    return (
      PIPELINE_STAGES.find((s) => s.id === selectedStage) || PIPELINE_STAGES[0]
    );
  }, [selectedStage]);

  // Candidates in the selected stage matching search and sort
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
          const scoreA = (a as unknown as { matchScore?: number }).matchScore ?? -1;
          const scoreB = (b as unknown as { matchScore?: number }).matchScore ?? -1;
          return scoreB - scoreA;
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

  // Auto-select candidate when stage changes
  useEffect(() => {
    if (filteredCandidates.length > 0) {
      if (!selectedAppId || !filteredCandidates.some((c) => String(c.id) === String(selectedAppId))) {
        setSelectedAppId(filteredCandidates[0].id);
      }
    } else {
      setSelectedAppId(null);
    }
  }, [filteredCandidates, selectedAppId]);

  // Active selected candidate object
  const selectedCandidate = useMemo(() => {
    return (
      filteredCandidates.find((c) => String(c.id) === String(selectedAppId)) ||
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
      setSelectedAppId(filteredCandidates[currentIndex - 1].id);
    }
  };

  const handleNextCandidate = () => {
    if (currentIndex >= 0 && currentIndex < filteredCandidates.length - 1) {
      setSelectedAppId(filteredCandidates[currentIndex + 1].id);
    }
  };

  // Documents of selected candidate
  const candidateDocuments = useMemo(() => {
    if (!selectedCandidate) return [];
    const seenUrls = new Set<string>();
    const allDocs: CandidateDocument[] = [];
    const relatedApps = allApplications.filter(
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
  }, [selectedCandidate, allApplications]);

  // Sync initial notes list
  useEffect(() => {
    if (selectedCandidate) {
      const parsed = parseCandidateNotes(
        selectedCandidate.notes,
        selectedCandidate.candidateName,
      );
      setCandidateNotesList(parsed.customNotes ? [parsed.customNotes] : []);
      setCandidateNoteInput("");
    }
  }, [selectedCandidate]);

  const handleAddNote = () => {
    if (!candidateNoteInput.trim()) return;
    setCandidateNotesList((prev) => [...prev, candidateNoteInput.trim()]);
    setCandidateNoteInput("");
  };

  // Handle stage change for selected candidate
  const handleMoveCandidateStage = async (newStage: ApplicationStage) => {
    if (!selectedCandidate) return;
    try {
      await updateStageMutation.mutateAsync({
        id: selectedCandidate.id,
        stage: newStage,
      });
      setSelectedStage(newStage);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("stage", newStage);
      router.replace(`/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`, {
        scroll: false,
      });
    } catch (err) {
      console.error("Failed to move candidate stage", err);
    }
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
    const apiUrl = getApiBaseUrl();
    try {
      const targetUrl = activeAppId
        ? `${apiUrl}/applications/${activeAppId}/documents/download${queryString}`
        : url;

      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error("Download request failed");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      const fallbackUrl = activeAppId
        ? `${apiUrl}/applications/${activeAppId}/documents/download${queryString}`
        : url;
      const a = document.createElement("a");
      a.href = fallbackUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
      {/* 2. Pipeline Stages Sub-header (Matching Screenshot Row 2) */}
      <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs px-4 py-2 sm:px-6 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none z-10">
        {/* Stage Pills */}
        <div className="flex items-center gap-2">
          {pipelineStages.map((stage) => {
            const count = stageCounts[stage.id] || 0;
            const isSelected = selectedStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleSelectStage(stage.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? stage.activePill
                    : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${stage.dotColor}`}
                />
                <span>{stage.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? stage.pillBadge
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Info stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-400 shrink-0">
          <span>{jobApplications.length} {t("pipeline.stageCounts")}</span>
          <span>•</span>
          <span>6 {t("pipeline.stages.applied").toLowerCase()}...</span>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Toggle fullscreen view"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Main Master-Detail Workspace: LOCKED HEIGHT, ONLY CONTENT SCROLLS */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT COLUMN: Candidates List */}
        <aside
          className={`w-full md:w-80 lg:w-84 shrink-0 flex flex-col h-full border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden ${
            mobileDetailOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search box & Toolbar */}
          <div className="shrink-0 p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder={t("candidates.searchCandidates")}
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
                  setSortBy(
                    val as
                      | "score"
                      | "newest"
                      | "oldest"
                      | "name",
                  )
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
                title="Filter options (Coming soon)"
              >
                <Menu className="h-3 w-3" />
              </button>
            </div>

            {/* Counter */}
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
              filteredCandidates.map((candidate) => {
                const isSelected =
                  String(candidate.id) === String(selectedAppId);
                const displayName = getCandidateDisplayName(candidate);
                const initials = getInitials(displayName);

                return (
                  <div
                    key={candidate.id}
                    onClick={() => {
                      setSelectedAppId(candidate.id);
                      setMobileDetailOpen(true);
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 dark:border-blue-400"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Initials circle */}
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            isSelected
                              ? "text-blue-900 dark:text-blue-300"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {displayName}
                        </h4>
                        {(candidate as unknown as { matchScore?: number }).matchScore !== undefined &&
                          (candidate as unknown as { matchScore?: number }).matchScore !== null && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {(candidate as unknown as { matchScore?: number }).matchScore}%
                            </span>
                          )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {candidate.candidateEmail || "No email"}
                      </p>

                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                        <span>{formatRelativeTime(candidate.createdAt)}</span>
                        {candidate.notes && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="h-2.5 w-2.5" />
                              <span>{t("candidates.columns.quickNotes")}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Candidate Detail Content */}
        <section
          className={`flex-1 min-h-0 h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 ${
            mobileDetailOpen ? "block" : "hidden md:block"
          }`}
        >
          {selectedCandidate ? (
            /* State with candidate selected matching Screenshot 2 */
            <div className="max-w-4xl mx-auto space-y-5 pb-12">
              {/* Mobile Back Button to return to list */}
              <div className="md:hidden pb-1">
                <button
                  type="button"
                  onClick={() => setMobileDetailOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{t("applications.backToApplications")}</span>
                </button>
              </div>

              {/* Quick Stage Transition Buttons (Admins only) */}
              {canEdit && (
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {PIPELINE_STAGES.filter(
                    (stage) => stage.id !== selectedCandidate.stage,
                  ).map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => handleMoveCandidateStage(stage.id)}
                      disabled={updateStageMutation.isPending}
                      className={`h-8 px-3.5 rounded-xl ${stage.btnBg} ${stage.btnHover} text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50`}
                    >
                      <span>{stage.actionLabel}</span>
                      <span className="h-4 w-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                        {stage.stepNumber}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Candidate Info Header Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3.5">
                    {/* Big Avatar circle */}
                    <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                      {getInitials(getCandidateDisplayName(selectedCandidate))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {getCandidateDisplayName(selectedCandidate)}
                        </h2>
                        <StageBadge stage={selectedCandidate.stage} />
                      </div>

                      {/* Contact metadata row */}
                      <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {selectedCandidate.candidateEmail && (
                          <a
                            href={`mailto:${selectedCandidate.candidateEmail}`}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{selectedCandidate.candidateEmail}</span>
                          </a>
                        )}

                        {selectedCandidate.candidatePhone && (
                          <a
                            href={`tel:${selectedCandidate.candidatePhone}`}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{selectedCandidate.candidatePhone}</span>
                          </a>
                        )}

                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {t("applications.applied")}{" "}
                            {formatDate(selectedCandidate.createdAt)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation arrows (1/X) and popout link */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={handlePrevCandidate}
                      disabled={currentIndex <= 0}
                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t("common.back")}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    <span className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {currentIndex + 1} / {filteredCandidates.length}
                    </span>

                    <button
                      type="button"
                      onClick={handleNextCandidate}
                      disabled={currentIndex >= filteredCandidates.length - 1}
                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t("common.next")}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <Link
                      href={`/dashboard/applications/${selectedCandidate.id}`}
                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                      title={t("applications.openFullPage")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs matching Screenshot */}
              <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
                {/* Overview tab with rotating arrow & Popover */}
                <div
                  className={`relative flex items-center border-b-2 -mb-[1px] transition-colors ${
                    candidateTab === "overview"
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateTab("overview");
                      setIsOverviewPopoverOpen(false);
                    }}
                    className={`py-2.5 cursor-pointer whitespace-nowrap ${
                      candidateTab === "overview" ? "pl-3.5 pr-1" : "px-3.5"
                    }`}
                  >
                    {t("applications.tabs.overview")}
                  </button>

                  {candidateTab === "overview" && (
                    <button
                      ref={overviewBtnRef}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOverviewPopoverOpen((prev) => !prev);
                      }}
                      className="py-2.5 pr-2.5 pl-0.5 cursor-pointer flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      aria-label="Toggle overview sections"
                      title="Toggle overview sections"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isOverviewPopoverOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </button>
                  )}

                  <OverviewSectionsPopover
                    isOpen={isOverviewPopoverOpen}
                    onClose={() => setIsOverviewPopoverOpen(false)}
                    sections={overviewSections}
                    onToggleSection={(key) =>
                      setOverviewSections((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    triggerRef={overviewBtnRef}
                  />
                </div>

                {[
                  { id: "inbox", label: t("applications.tabs.inbox") },
                  { id: "ai", label: t("applications.tabs.ai") },
                  { id: "interviews", label: t("applications.tabs.interviews") },
                  {
                    id: "documents",
                    label: `${t("applications.tabs.documents")} ${
                      candidateDocuments.length > 0
                        ? `(${candidateDocuments.length})`
                        : ""
                    }`,
                  },
                  { id: "responses", label: t("applications.tabs.responses") },
                  { id: "notes", label: t("applications.tabs.notes") },
                  { id: "timeline", label: t("applications.tabs.timeline") },
                  { id: "properties", label: t("applications.tabs.properties") },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCandidateTab(tab.id);
                      setIsOverviewPopoverOpen(false);
                    }}
                    className={`px-3.5 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                      candidateTab === tab.id
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content Sections */}
              <div className="space-y-4">
                {/* Overview Tab Content */}
                {candidateTab === "overview" && (
                  <>
                    {/* 1. AI Analysis Card */}
                    {overviewSections.ai && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 font-medium">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{t("applications.noAiAnalysis")}</span>
                        </div>
                        <button
                          type="button"
                          disabled
                          className="h-8 px-3.5 rounded-xl bg-blue-600/60 text-white/80 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-not-allowed opacity-60 transition-colors"
                          title={`${t("applications.runAnalysis")} (${t("common.comingSoon")})`}
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>{t("applications.runAnalysis")}</span>
                        </button>
                      </div>
                    )}

                    {/* 2. Interviews Card */}
                    {overviewSections.interviews && (
                      <CandidateInterviewsList
                        notes={selectedCandidate.notes}
                        onSchedule={() => setScheduleModalOpen(true)}
                        onCancelInterview={handleCancelInterview}
                        canEdit={canEdit}
                        title={t("applications.sections.interviews")}
                        showSectionHeader={true}
                      />
                    )}

                    {/* 3. Documents Card */}
                    {overviewSections.documents && (
                      <ApplicationDocumentsSection
                        documents={candidateDocuments}
                        appId={selectedCandidate.id}
                        onPreview={(doc) => setPreviewDoc(doc)}
                        onDownload={handleDownloadDoc}
                      />
                    )}

                    {/* 4. Responses Card */}
                    {overviewSections.responses && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t("applications.sections.responses")}</span>
                        </h3>
                        <p className="text-xs text-slate-400 py-1">
                          {t("applications.noResponses")}
                        </p>
                      </div>
                    )}

                    {/* 5. Properties Card */}
                    {overviewSections.properties && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t("applications.sections.properties")}</span>
                        </h3>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
                          <button
                            type="button"
                            disabled
                            className="opacity-50 cursor-not-allowed transition-colors"
                            title={`Properties (${t("common.comingSoon")})`}
                          >
                            + {t("applications.addOrgProperty")}
                          </button>
                          <button
                            type="button"
                            disabled
                            className="opacity-50 cursor-not-allowed transition-colors"
                            title={`Properties (${t("common.comingSoon")})`}
                          >
                            {t("applications.manageJobProperties")}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 6. Notes Card */}
                    {overviewSections.notes && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t("applications.sections.notes")}</span>
                        </h3>

                        {/* Note Input area */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 focus-within:ring-1 focus-within:ring-blue-500">
                          <textarea
                            placeholder={t("applications.notePlaceholder")}
                            value={candidateNoteInput}
                            onChange={(e) =>
                              setCandidateNoteInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddNote();
                              }
                            }}
                            rows={3}
                            className="w-full resize-none bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                          />
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="text-[11px] text-slate-400">
                              {t("pipeline.onlyTeamCanSeeNotes")}
                            </span>
                            <Button
                              size="sm"
                              onClick={handleAddNote}
                              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                            >
                              + {t("applications.addNote")}
                            </Button>
                          </div>
                        </div>

                        {/* List notes or "No notes yet." */}
                        {candidateNotesList.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                            <span>{t("pipeline.noNotesYet")}</span>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {candidateNotesList.map((note, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                              >
                                {note}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Documents Tab */}
                {candidateTab === "documents" && (
                  <ApplicationDocumentsSection
                    documents={candidateDocuments}
                    appId={selectedCandidate.id}
                    onPreview={(doc) => setPreviewDoc(doc)}
                    onDownload={handleDownloadDoc}
                  />
                )}

                {/* AI Analysis Tab */}
                {candidateTab === "ai" && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-6 text-center space-y-3">
                    <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto" />
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      {t("pipeline.aiResumeAnalysis")}
                    </h4>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80 max-w-md mx-auto">
                      {t("pipeline.aiResumeAnalysisDesc")}
                    </p>
                    <Button
                      size="sm"
                      disabled
                      className="bg-blue-600/60 text-white/80 rounded-xl text-xs cursor-not-allowed opacity-60"
                      title={`${t("pipeline.startAiEvaluation")} (${t("common.comingSoon")})`}
                    >
                      {t("pipeline.startAiEvaluation")}
                    </Button>
                  </div>
                )}

                {/* Interviews Tab */}
                {candidateTab === "interviews" && (
                  <CandidateInterviewsList
                    notes={selectedCandidate.notes}
                    onSchedule={() => setScheduleModalOpen(true)}
                    onCancelInterview={handleCancelInterview}
                    canEdit={canEdit}
                    showSectionHeader={true}
                  />
                )}

                {/* Responses Tab */}
                {candidateTab === "responses" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
                    <FileCheck className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t("pipeline.noResponsesTitle")}
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      {t("pipeline.noResponsesSubtitle")}
                    </p>
                  </div>
                )}

                {/* Notes Tab */}
                {candidateTab === "notes" && (
                  <div className="space-y-4">
                    {/* Input box (Admins only) */}
                    {canEdit && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t("pipeline.addNewNote")}</span>
                        </h4>
                        <textarea
                          placeholder={t("pipeline.writePrivateNotePlaceholder")}
                          value={candidateNoteInput}
                          onChange={(e) =>
                            setCandidateNoteInput(e.target.value)
                          }
                          rows={3}
                          className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={handleAddNote}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs cursor-pointer"
                          >
                            {t("pipeline.saveNote")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Notes List */}
                    {candidateNotesList.length > 0 && (
                      <div className="space-y-2">
                        {candidateNotesList.map((n, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300"
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline Tab */}
                {candidateTab === "timeline" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
                    <History className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t("applications.timelineTitle")}
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      {t("pipeline.timelineApplied", {
                        job: job.title,
                        date: formatDate(selectedCandidate.createdAt),
                      })}
                    </p>
                  </div>
                )}

                {/* Properties Tab */}
                {candidateTab === "properties" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t("applications.sections.properties")}</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      {t("pipeline.noCustomProperties")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty state when no candidate is in stage */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("pipeline.noCandidatesInStage", {
                  stage: currentStageConfig.label,
                })}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {t("pipeline.switchStageHint")}
              </p>
            </div>
          )}
        </section>
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
          onClose={() => setScheduleModalOpen(false)}
          jobs={[job]}
          applications={allApplications}
          selectedJobId={job.id}
          selectedApplicationId={selectedCandidate?.id}
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
