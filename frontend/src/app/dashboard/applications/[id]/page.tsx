"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import {
  useJobs,
  useAllApplications,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
  History,
  FileCheck,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { StageBadge } from "@/components/ui/stage-badge";
import {
  getInitials,
  formatDate,
  isValidUuid,
  getCandidateDisplayName,
  parseCandidateDocuments,
  fixUtf8String,
} from "@/lib/utils";

function ApplicationDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const appIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [noteInput, setNoteInput] = useState("");
  const [notesList, setNotesList] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Overview sections visibility dropdown state
  const [overviewSections, setOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isOverviewPopoverOpen, setIsOverviewPopoverOpen] = useState(false);
  const overviewBtnRef = useRef<HTMLButtonElement>(null);
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);

  const loading = jobsLoading || appsLoading;

  const isAppIdValid = isValidUuid(appIdStr);
  const app = isAppIdValid
    ? applications.find((a) => String(a.id) === String(appIdStr))
    : undefined;
  const job = jobs.find((j) => j.id === app?.jobId);

  const candidateDocuments = useMemo(() => {
    if (!app) return [];
    const seenUrls = new Set<string>();
    const allDocs: CandidateDocument[] = [];
    const relatedApps = applications.filter(
      (a) => a.candidateEmail && a.candidateEmail === app.candidateEmail,
    );
    const appsToScan = relatedApps.length > 0 ? relatedApps : [app];

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
  }, [app, applications]);

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
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const activeAppId = targetAppId || app?.id;
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

  const handleStageChange = async (newStage: ApplicationStage) => {
    if (!app) return;
    try {
      await updateStageMutation.mutateAsync({
        id: app.id,
        stage: newStage,
      });
    } catch (err) {
      console.error("Failed to update stage:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!app) return;
    try {
      setIsDeleting(true);
      await deleteAppMutation.mutateAsync(app.id);
      setIsDeleteModalOpen(false);
      router.push("/dashboard/applications");
    } catch (err) {
      console.error("Failed to delete application:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="applications"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => {}}
          jobsCount={jobs.length}
          candidatesCount={applications.length}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if ((!isAppIdValid || !app) && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="applications"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => {}}
          jobsCount={jobs.length}
          candidatesCount={applications.length}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-1 border border-rose-200 dark:border-rose-900 shadow-xs">
            <span className="text-lg font-black">404</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Application Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {!isAppIdValid
              ? "The application ID provided is invalid. A valid UUID is required."
              : "The application you are looking for does not exist or has been removed."}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard/applications")}
              variant="outline"
              className="text-xs font-semibold rounded-xl"
            >
              Back to Applications
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const candidateName = getCandidateDisplayName(app);
  const candidateEmail = app?.candidateEmail || "—";
  const candidatePhone = app?.candidatePhone || "";
  const jobTitle = job
    ? `${job.title} (${job.type === "FULL_TIME" ? "Full-Time" : job.type === "PART_TIME" ? "Part-Time" : job.type})`
    : app?.jobId
      ? `Job #${app.jobId}`
      : "Unassigned Role";
  const appliedDate = formatDate(app?.createdAt);
  const initials = getInitials(candidateName);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => {}}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Container */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-5">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Applications</span>
          </Link>
        </div>

        {/* Stage Action Pipeline Bar matching Screenshot 2 & 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Left Stage Action Buttons (All stages except current) */}
          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINE_STAGES.filter((stage) => stage.id !== app?.stage).map(
              (stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleStageChange(stage.id)}
                  disabled={updateStageMutation.isPending}
                  className={`h-8 px-3.5 rounded-xl ${stage.btnBg} ${stage.btnHover} text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50`}
                >
                  <span>{stage.actionLabel}</span>
                  <span className="h-4 w-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {stage.stepNumber}
                  </span>
                </button>
              ),
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="h-8 px-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 shadow-xs flex items-center gap-1.5 opacity-50 cursor-not-allowed transition-colors"
              title="Schedule Interview (Coming soon)"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Schedule Interview</span>
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-8 px-3 rounded-xl border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete application</span>
            </button>
          </div>
        </div>

        {/* Candidate Header Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
              {initials}
            </div>

            {/* Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  {candidateName}
                </h1>
                <StageBadge stage={app?.stage} />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <a
                  href={`mailto:${candidateEmail}`}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{candidateEmail}</span>
                </a>
                {candidatePhone && (
                  <a
                    href={`tel:${candidatePhone}`}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{candidatePhone}</span>
                  </a>
                )}
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  {jobTitle}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                <Clock className="h-3 w-3" />
                <span>Applied {appliedDate}</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              className="h-8 w-8 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center shadow-xs cursor-pointer"
              title="Compare"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs matching Screenshot 1, 2, 3 */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
          {/* Overview tab with conditional arrow & dropdown toggle */}
          <div
            className={`relative flex items-center border-b-2 -mb-[1px] transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab("overview");
                setIsOverviewPopoverOpen(false);
              }}
              className={`py-2.5 cursor-pointer whitespace-nowrap ${
                activeTab === "overview" ? "pl-3.5 pr-1" : "px-3.5"
              }`}
            >
              Overview
            </button>

            {activeTab === "overview" && (
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
                setOverviewSections((prev) => ({ ...prev, [key]: !prev[key] }))
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
              label: `Documents (${candidateDocuments.length})`,
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
                setActiveTab(tab.id);
                setIsOverviewPopoverOpen(false);
              }}
              className={`px-3.5 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="space-y-4">
          {/* Overview Tab: Renders sections selected in overviewSections */}
          {activeTab === "overview" && (
            <>
              {/* 1. AI Analysis */}
              {overviewSections.ai && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 font-medium">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>No AI analysis yet</span>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="h-8 px-3.5 rounded-xl bg-blue-600/60 text-white/80 text-xs font-bold shadow-xs flex items-center gap-1.5 opacity-60 cursor-not-allowed transition-colors"
                    title="AI Analysis (Coming soon)"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Run Analysis</span>
                  </button>
                </div>
              )}

              {/* 2. Interviews */}
              {overviewSections.interviews && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Interviews</span>
                    </h3>
                    <button
                      type="button"
                      disabled
                      className="text-xs font-semibold text-slate-400 dark:text-slate-600 flex items-center gap-1 opacity-50 cursor-not-allowed transition-colors"
                      title="Schedule Interview (Coming soon)"
                    >
                      <span>+ Schedule Interview</span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-1.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No interviews scheduled
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Schedule an interview to start the process.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Documents (Reused component matching Screenshot 1 & 3) */}
              {overviewSections.documents && (
                <ApplicationDocumentsSection
                  documents={candidateDocuments}
                  appId={app?.id}
                  onPreview={(doc) => setPreviewDoc(doc)}
                  onDownload={handleDownloadDoc}
                />
              )}

              {/* 4. Responses */}
              {overviewSections.responses && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                    <span>Responses</span>
                  </h3>
                  <p className="text-xs text-slate-400 py-1">
                    No application form responses.
                  </p>
                </div>
              )}

              {/* 5. Notes */}
              {overviewSections.notes && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    <span>Notes</span>
                  </h3>

                  {notesList.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {notesList.map((note, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add a note about this candidate..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && noteInput.trim()) {
                          setNotesList((prev) => [...prev, noteInput.trim()]);
                          setNoteInput("");
                        }
                      }}
                      className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    {noteInput.trim() && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (noteInput.trim()) {
                            setNotesList((prev) => [...prev, noteInput.trim()]);
                            setNoteInput("");
                          }
                        }}
                        className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                      >
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 6. Properties */}
              {overviewSections.properties && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    <span>Properties</span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
                    <button
                      type="button"
                      disabled
                      className="opacity-50 cursor-not-allowed transition-colors"
                      title="Properties (Coming soon)"
                    >
                      + Add org-wide property
                    </button>
                    <button
                      type="button"
                      disabled
                      className="opacity-50 cursor-not-allowed transition-colors"
                      title="Properties (Coming soon)"
                    >
                      Manage job-specific properties
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Documents Tab: Reused component matching Screenshot 3 */}
          {activeTab === "documents" && (
            <ApplicationDocumentsSection
              documents={candidateDocuments}
              appId={app?.id}
              onPreview={(doc) => setPreviewDoc(doc)}
              onDownload={handleDownloadDoc}
            />
          )}

          {/* Individual Tab Contents */}
          {activeTab === "ai" && (
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

          {activeTab === "interviews" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Interviews</span>
                </h3>
                <button
                  type="button"
                  disabled
                  className="text-xs font-semibold text-slate-400 dark:text-slate-600 flex items-center gap-1 opacity-50 cursor-not-allowed transition-colors"
                  title="Schedule Interview (Coming soon)"
                >
                  <span>+ Schedule Interview</span>
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-8 text-center space-y-1.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                  <Calendar className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No interviews scheduled
                </h4>
                <p className="text-[11px] text-slate-400">
                  Schedule an interview to start the process.
                </p>
              </div>
            </div>
          )}

          {activeTab === "responses" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Responses</span>
              </h3>
              <p className="text-xs text-slate-400 py-1">
                No application form responses.
              </p>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                <span>Notes</span>
              </h3>

              {notesList.length > 0 && (
                <div className="space-y-2 mb-3">
                  {notesList.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a note about this candidate..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && noteInput.trim()) {
                      setNotesList((prev) => [...prev, noteInput.trim()]);
                      setNoteInput("");
                    }
                  }}
                  className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                {noteInput.trim() && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (noteInput.trim()) {
                        setNotesList((prev) => [...prev, noteInput.trim()]);
                        setNoteInput("");
                      }
                    }}
                    className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeTab === "properties" && (
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

          {activeTab === "inbox" && (
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

          {activeTab === "timeline" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-2">
              <History className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Application Timeline
              </h4>
              <p className="text-[11px] text-slate-400">
                Applied on {appliedDate}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Document Preview Modal matching Screenshot 2 */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        appId={app?.id}
        onDownload={handleDownloadDoc}
      />

      {/* Delete Application Confirmation Modal */}
      {app && (
        <DeleteApplicationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          candidateName={getCandidateDisplayName(app)}
          jobTitle={jobTitle}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

export default function ApplicationDetailPage() {
  return (
    <AuthGuard>
      <ApplicationDetailPageContent />
    </AuthGuard>
  );
}
