"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import {
  useJob,
  useJobs,
  useAllApplications,
  useUpdateStageMutation,
  useUpdateJobMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Briefcase,
  ArrowLeft,
  Columns3,
  Megaphone,
  Table,
  Download,
  Mail,
  FileText,
  Zap,
  BarChart2,
  Sparkles,
  Settings,
  Plus,
  MoreHorizontal,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  ExternalLink,
  Calendar,
  Clock,
  SlidersHorizontal,
  History,
  FileCheck,
  Maximize2,
  Minimize2,
  MessageSquare,
  User,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApplyModal } from "@/components/applications/apply-modal";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import type { ApplicationStage, CandidateDocument } from "@/types";
import { PIPELINE_STAGES } from "@/lib/stages";
import {
  getInitials,
  formatRelativeTime,
  formatDate,
  getStageInfo,
  getCandidateDisplayName,
  parseCandidateDocuments,
  parseCandidateNotes,
  fixUtf8String,
} from "@/lib/utils";

function JobDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { user } = useAuth();
  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: allApplications = [], isLoading: appsLoading } =
    useAllApplications();

  const updateStageMutation = useUpdateStageMutation();
  const updateJobMutation = useUpdateJobMutation();
  const deleteAppMutation = useDeleteApplicationMutation();

  // Top header job navigation tab (Pipeline, Promote, Table, etc.)
  const [jobNavTab, setJobNavTab] = useState<string>("pipeline");

  // Selected stage filter for candidate pipeline
  const [selectedStage, setSelectedStage] =
    useState<ApplicationStage>("APPLIED");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">(
    "score",
  );

  // Selected candidate in master-detail view
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Candidate detail sub-navigation tab (Overview, Inbox, Documents, etc.)
  const [candidateTab, setCandidateTab] = useState<string>("overview");

  // Candidate overview section visibility state
  const [overviewSections, setOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isOverviewPopoverOpen, setIsOverviewPopoverOpen] = useState(false);
  const overviewBtnRef = useRef<HTMLButtonElement>(null);

  // Modals state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);
  const [deleteAppModalOpen, setDeleteAppModalOpen] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        const name = getCandidateDisplayName(app).toLowerCase();
        const email = (app.candidateEmail || "").toLowerCase();
        const phone = (app.candidatePhone || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "score") {
          return (b.matchScore ?? 0) - (a.matchScore ?? 0);
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
          return getCandidateDisplayName(a).localeCompare(
            getCandidateDisplayName(b),
          );
        }
        return 0;
      });
  }, [jobApplications, selectedStage, searchQuery, sortBy]);

  // Auto-select first candidate when stage changes or when candidates change
  useEffect(() => {
    if (filteredCandidates.length > 0) {
      const exists = filteredCandidates.some(
        (c) => String(c.id) === String(selectedAppId),
      );
      if (!exists) {
        setSelectedAppId(filteredCandidates[0].id);
      }
    } else {
      setSelectedAppId(null);
    }
  }, [filteredCandidates, selectedAppId]);

  // The active candidate object
  const selectedCandidate = useMemo(() => {
    if (!selectedAppId) return null;
    return (
      jobApplications.find((a) => String(a.id) === String(selectedAppId)) ||
      null
    );
  }, [jobApplications, selectedAppId]);

  // Update candidate notes when selectedCandidate changes
  useEffect(() => {
    if (selectedCandidate?.notes) {
      const parsed = parseCandidateNotes(selectedCandidate.notes);
      if (parsed.customNotes) {
        setCandidateNotesList([parsed.customNotes]);
      } else {
        setCandidateNotesList([]);
      }
    } else {
      setCandidateNotesList([]);
    }
    setCandidateNoteInput("");
  }, [selectedCandidate?.id, selectedCandidate?.notes]);

  // Current index in filtered list for previous/next buttons
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
    if (currentIndex < filteredCandidates.length - 1) {
      setSelectedAppId(filteredCandidates[currentIndex + 1].id);
    }
  };

  // Documents for the selected candidate
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

  // Handle stage change for selected candidate
  const handleMoveCandidateStage = async (newStage: ApplicationStage) => {
    if (!selectedCandidate) return;
    try {
      await updateStageMutation.mutateAsync({
        id: selectedCandidate.id,
        stage: newStage,
      });
    } catch (err) {
      console.error("Failed to move candidate stage", err);
    }
  };

  // Toggle Job Open/Closed status
  const handleToggleJobStatus = async () => {
    if (!job) return;
    const newStatus = job.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await updateJobMutation.mutateAsync({
        id: job.id,
        data: { status: newStatus },
      });
    } catch (err) {
      console.error("Failed to update job status", err);
    }
  };

  // Handle download document
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
    try {
      const targetUrl = activeAppId
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/applications/${activeAppId}/documents/download${queryString}`
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
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/applications/${activeAppId}/documents/download${queryString}`
        : url;
      const a = document.createElement("a");
      a.href = fallbackUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Handle adding candidate note
  const handleAddNote = () => {
    if (!candidateNoteInput.trim()) return;
    setCandidateNotesList((prev) => [...prev, candidateNoteInput.trim()]);
    setCandidateNoteInput("");
  };

  // Handle candidate deletion
  const handleConfirmDeleteCandidate = async () => {
    if (!selectedCandidate) return;
    setIsDeletingApp(true);
    try {
      await deleteAppMutation.mutateAsync(selectedCandidate.id);
      setDeleteAppModalOpen(false);
      setSelectedAppId(null);
    } catch (err) {
      console.error("Failed to delete candidate", err);
    } finally {
      setIsDeletingApp(false);
    }
  };

  const loading = jobLoading || appsLoading;

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
        <div className="shrink-0">
          <Navbar
            activeTab="jobs"
            onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
            onOpenApplyModal={() => setApplyModalOpen(true)}
            jobsCount={jobs.length}
            candidatesCount={allApplications.length}
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
        <div className="shrink-0">
          <Navbar
            activeTab="jobs"
            onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
            onOpenApplyModal={() => setApplyModalOpen(true)}
            jobsCount={jobs.length}
            candidatesCount={allApplications.length}
          />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Job Not Found
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            The job you are looking for does not exist or may have been removed.
          </p>
          <Button
            onClick={() => router.push("/dashboard/jobs")}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer"
          >
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const jobTypeLabel =
    job.type === "FULL_TIME"
      ? "Full-Time"
      : job.type === "PART_TIME"
        ? "Part-Time"
        : job.type === "CONTRACT"
          ? "Contract"
          : "Internship";

  // Counter text matching screenshots
  const candidateCountText =
    filteredCandidates.length === 0
      ? "Showing 0-0 of 0 candidates"
      : `Showing 1-${filteredCandidates.length} of ${filteredCandidates.length} candidate${
          filteredCandidates.length > 1 ? "s" : ""
        }`;

  return (
    <div
      className={`h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-200 ${
        isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-slate-950" : ""
      }`}
    >
      {/* Global Navbar */}
      <div className="shrink-0">
        <Navbar
          activeTab="jobs"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => setApplyModalOpen(true)}
          jobsCount={jobs.length}
          candidatesCount={allApplications.length}
        />
      </div>

      {/* 1. Job Workspace Header (Matching Screenshot Row 1) */}
      <header className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 sm:px-6 z-20 shadow-2xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Back button & Job Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Jobs</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-md">
                {job.title}{" "}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  ({jobTypeLabel})
                </span>
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  job.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60"
                    : "bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60"
                }`}
              >
                {job.status === "PUBLISHED" ? "Open" : "Draft"}
              </span>
            </div>
          </div>

          {/* Middle: Job Feature Tabs */}
          <div className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {[
              { id: "pipeline", label: "Pipeline", icon: Columns3 },
              { id: "promote", label: "Promote", icon: Megaphone },
              { id: "table", label: "Table", icon: Table },
              { id: "import", label: "Import", icon: Download },
              { id: "inbox", label: "Inbox", icon: Mail },
              { id: "form", label: "Application Form", icon: FileText },
              { id: "automation", label: "Automation", icon: Zap },
              { id: "tracking", label: "Source Tracking", icon: BarChart2 },
              { id: "ai", label: "AI Analysis", icon: Sparkles },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = jobNavTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setJobNavTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-bold dark:bg-slate-800 dark:text-white"
                      : "hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setApplyModalOpen(true)}
              className="h-7 px-2.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-2xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Add Candidate</span>
            </Button>

            <button
              type="button"
              onClick={handleToggleJobStatus}
              className={`h-7 px-3 text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition-colors ${
                job.status === "PUBLISHED"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {job.status === "PUBLISHED" ? "Close" : "Open"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/candidates?jobId=${job.id}`)
              }
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Pipeline Stages Sub-header (Matching Screenshot Row 2) */}
      <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs px-4 py-2 sm:px-6 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none z-10">
        {/* Stage Pills */}
        <div className="flex items-center gap-2">
          {PIPELINE_STAGES.map((stage) => {
            const count = stageCounts[stage.id] || 0;
            const isSelected = selectedStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setSelectedStage(stage.id);
                  setCandidateTab("overview");
                }}
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
          <span>{jobApplications.length} candidates</span>
          <span>•</span>
          <span>6 stages</span>
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
        <aside className="w-80 sm:w-84 shrink-0 flex flex-col h-full border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Search box & Toolbar (shrink-0) */}
          <div className="shrink-0 p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            {/* Sort toolbar */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3 w-3" />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | "score"
                        | "newest"
                        | "oldest"
                        | "name",
                    )
                  }
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 border-none outline-none cursor-pointer"
                >
                  <option value="score">Highest score</option>
                  <option value="newest">Newest applied</option>
                  <option value="oldest">Oldest applied</option>
                  <option value="name">Candidate name</option>
                </select>
              </div>

              <button
                type="button"
                className="h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Filter options"
              >
                <Menu className="h-3 w-3" />
              </button>
            </div>

            {/* Counter */}
            <p className="text-[10px] text-slate-400 font-medium pt-0.5">
              {candidateCountText}
            </p>
          </div>

          {/* Candidates List Container (flex-1 min-h-0 overflow-y-auto) */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
            {filteredCandidates.length === 0 ? (
              /* Empty state matching Screenshot 1 */
              <div className="pt-8 pb-6 px-4 flex flex-col items-center text-center space-y-2 text-slate-400">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No candidates yet
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    No one in {currentStageConfig.label} stage.
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
                    onClick={() => setSelectedAppId(candidate.id)}
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
                        {candidate.matchScore !== undefined &&
                          candidate.matchScore !== null && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {candidate.matchScore}%
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
                              <span>Note</span>
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
        <section className="flex-1 min-h-0 h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
          {selectedCandidate ? (
            /* State with candidate selected matching Screenshot 2 */
            <div className="max-w-4xl mx-auto space-y-5 pb-12">
              {/* Quick Stage Transition Buttons (All stages except current) */}
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/60 uppercase">
                          {getStageInfo(selectedCandidate.stage).label}
                        </span>
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
                            Applied {formatDate(selectedCandidate.createdAt)}
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
                      title="Previous candidate"
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
                      title="Next candidate"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <Link
                      href={`/dashboard/applications/${selectedCandidate.id}`}
                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                      title="Open full application page"
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
                    Overview
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
                  { id: "inbox", label: "Inbox" },
                  { id: "ai", label: "AI Analysis" },
                  { id: "interviews", label: "Interviews" },
                  {
                    id: "documents",
                    label: `Documents ${
                      candidateDocuments.length > 0
                        ? `${candidateDocuments.length}`
                        : ""
                    }`,
                  },
                  { id: "responses", label: "Responses" },
                  { id: "notes", label: "Notes" },
                  { id: "timeline", label: "Timeline" },
                  { id: "properties", label: "Properties" },
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
                          <span>No AI analysis yet</span>
                        </div>
                        <button
                          type="button"
                          className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Run Analysis</span>
                        </button>
                      </div>
                    )}

                    {/* 2. Interviews Card */}
                    {overviewSections.interviews && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Interviews</span>
                          </h3>
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>+ Schedule Interview</span>
                          </button>
                        </div>

                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-1.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            No interviews scheduled yet.
                          </h4>
                        </div>
                      </div>
                    )}

                    {/* 3. Documents Card (Reused ApplicationDocumentsSection) */}
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
                          <span>Responses</span>
                        </h3>
                        <p className="text-xs text-slate-400 py-1">
                          No application form responses.
                        </p>
                      </div>
                    )}

                    {/* 5. Properties Card */}
                    {overviewSections.properties && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                          <span>Properties</span>
                        </h3>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
                          <button
                            type="button"
                            className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            + Add org-wide property
                          </button>
                          <button
                            type="button"
                            className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            Manage job-specific properties
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 6. Notes Card matching Screenshot 2 */}
                    {overviewSections.notes && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                          <span>Notes</span>
                        </h3>

                        {/* Note Input area matching Screenshot 2 */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 focus-within:ring-1 focus-within:ring-blue-500">
                          <textarea
                            placeholder="Add a note about this candidate..."
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
                              Only your team can see notes. ↵+Enter to save.
                            </span>
                            <Button
                              size="sm"
                              onClick={handleAddNote}
                              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                            >
                              + Add note
                            </Button>
                          </div>
                        </div>

                        {/* List notes or "No notes yet." matching Screenshot 2 */}
                        {candidateNotesList.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                            <span>No notes yet.</span>
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
                      Candidate AI Resume Analysis
                    </h4>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80 max-w-md mx-auto">
                      AI analyzes the candidate&apos;s resume, work history, and
                      skill fit against this job&apos;s requirements.
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs cursor-pointer"
                    >
                      Start AI Evaluation
                    </Button>
                  </div>
                )}

                {/* Interviews Tab */}
                {candidateTab === "interviews" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
                    <Calendar className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No interviews scheduled yet
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Schedule technical interviews, screening calls, or culture
                      fit evaluations for{" "}
                      {getCandidateDisplayName(selectedCandidate)}.
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs cursor-pointer"
                    >
                      + Schedule New Interview
                    </Button>
                  </div>
                )}

                {/* Responses Tab */}
                {candidateTab === "responses" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-2">
                    <FileCheck className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Application Responses
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Custom questionnaire and screening questions responses.
                    </p>
                  </div>
                )}

                {/* Notes Tab */}
                {candidateTab === "notes" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                      <span>Internal Notes</span>
                    </h3>

                    {candidateNotesList.length > 0 ? (
                      <div className="space-y-2">
                        {candidateNotesList.map((note, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-2">
                        No notes yet. Add thoughts or feedback about this
                        candidate.
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add a note about this candidate..."
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
                        className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                      {candidateNoteInput.trim() && (
                        <Button
                          size="sm"
                          onClick={handleAddNote}
                          className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                        >
                          Save
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Properties Tab */}
                {candidateTab === "properties" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                      <span>Custom Properties</span>
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
                      <button
                        type="button"
                        className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        + Add org-wide property
                      </button>
                      <button
                        type="button"
                        className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        Manage job-specific properties
                      </button>
                    </div>
                  </div>
                )}

                {/* Inbox Tab */}
                {candidateTab === "inbox" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-2">
                    <Mail className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No messages yet
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Email communications will appear here.
                    </p>
                  </div>
                )}

                {/* Timeline Tab */}
                {candidateTab === "timeline" && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-2">
                    <History className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Candidate Timeline
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Applied on {formatDate(selectedCandidate.createdAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Clean Empty State in Right Column matching Screenshot 1 (media_1787885727017.png) */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2 text-slate-400">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No candidates in {currentStageConfig.label}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Switch to another pipeline stage to review candidates.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
        selectedJobId={job.id}
      />

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
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <AuthGuard>
      <JobDetailPageContent />
    </AuthGuard>
  );
}
