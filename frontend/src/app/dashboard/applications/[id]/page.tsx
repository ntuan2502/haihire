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
  useUpdateCandidateMutation,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Trash2,
  Calendar,
  Clock,
  ExternalLink,
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
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import {
  parseInterviewFromNotes,
  removeInterviewFromNotes,
} from "@/lib/interviews";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import type { ApplicationStage, CandidateDocument } from "@/types";
import { PIPELINE_STAGES } from "@/lib/stages";
import { StageBadge } from "@/components/ui/stage-badge";
import { getApiBaseUrl } from "@/lib/api";
import {
  getInitials,
  formatDate,
  isValidUuid,
  getCandidateDisplayName,
  parseCandidateDocuments,
  fixUtf8String,
} from "@/lib/utils";
import { useI18n } from "@/i18n";

function ApplicationDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const appIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();
  const updateCandidateMutation = useUpdateCandidateMutation();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [noteInput, setNoteInput] = useState("");
  const [notesList, setNotesList] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Overview sections visibility dropdown state
  const [overviewSections, setOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isOverviewPopoverOpen, setIsOverviewPopoverOpen] = useState(false);
  const overviewBtnRef = useRef<HTMLButtonElement>(null);
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);

  // Cancel scheduled interview
  const handleCancelInterview = async () => {
    if (!app) return;
    try {
      const updatedNotes = removeInterviewFromNotes(app.notes);
      await updateCandidateMutation.mutateAsync({
        id: app.id,
        data: {
          notes: updatedNotes,
        },
      });
    } catch (err) {
      console.error("Failed to cancel interview:", err);
    }
  };

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
            {t("applications.applicationNotFound")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {!isAppIdValid
              ? t("applications.invalidAppId")
              : t("applications.appNotFoundDesc")}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard/applications")}
              variant="outline"
              className="text-xs font-semibold rounded-xl"
            >
              {t("applications.backToApplications")}
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
    ? `${job.title} (${job.type === "FULL_TIME" ? t("jobs.fullTime") : job.type === "PART_TIME" ? t("jobs.partTime") : job.type})`
    : app?.jobId
      ? `${t("jobs.jobTitle")} #${app.jobId}`
      : t("candidates.role");
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
            <span>{t("applications.backToApplications")}</span>
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
              title={`${t("applications.scheduleInterview")} (Coming soon)`}
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{t("applications.scheduleInterview")}</span>
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-8 px-3 rounded-xl border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("applications.deleteApplication")}</span>
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
                <span>{t("applications.applied")} {appliedDate}</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              className="h-8 w-8 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center shadow-xs cursor-pointer"
              title={t("applications.compare")}
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
              {t("applications.tabs.overview")}
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
            { id: "inbox", label: t("applications.tabs.inbox") },
            { id: "ai", label: t("applications.tabs.ai") },
            { id: "interviews", label: t("applications.tabs.interviews") },
            {
              id: "documents",
              label: `${t("applications.tabs.documents")} (${candidateDocuments.length})`,
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
                    <span>{t("applications.noAiAnalysis")}</span>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="h-8 px-3.5 rounded-xl bg-blue-600/60 text-white/80 text-xs font-bold shadow-xs flex items-center gap-1.5 opacity-60 cursor-not-allowed transition-colors"
                    title={`${t("applications.runAnalysis")} (Coming soon)`}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{t("applications.runAnalysis")}</span>
                  </button>
                </div>
              )}

              {/* 2. Interviews */}
              {overviewSections.interviews && (() => {
                const scheduled = parseInterviewFromNotes(app?.notes);
                return (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t("applications.sections.interviews")}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setScheduleModalOpen(true)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{scheduled ? "Cập nhật lịch" : `+ ${t("applications.scheduleInterview")}`}</span>
                      </button>
                    </div>

                    {scheduled ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>{scheduled.date} ({scheduled.time})</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-900/60">
                            {scheduled.type}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Người phỏng vấn:</span>
                            <strong className="text-slate-800 dark:text-slate-200">{scheduled.interviewer}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Hình thức:</span>
                            {scheduled.format === "OFFICE" ? (
                              <span className="font-semibold text-rose-600 dark:text-rose-400">Tại văn phòng</span>
                            ) : (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{scheduled.format}</span>
                            )}
                          </div>
                        </div>

                        {scheduled.linkOrLocation && (
                          <div className="text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            {scheduled.linkOrLocation.startsWith("http") ? (
                              <a
                                href={scheduled.linkOrLocation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Vào phòng họp trực tuyến</span>
                              </a>
                            ) : (
                              <span className="text-slate-600 dark:text-slate-400">
                                Địa điểm: <strong>{scheduled.linkOrLocation}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelInterview}
                            className="h-7 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                          >
                            Hủy lịch hẹn
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setScheduleModalOpen(true)}
                            className="h-7 px-3 text-xs font-semibold cursor-pointer"
                          >
                            Chỉnh sửa
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t("applications.noInterviews")}
                        </h4>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          {t("applications.noInterviewsDesc")}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setScheduleModalOpen(true)}
                          className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 mt-1"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{t("applications.scheduleInterview")}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                    <span>{t("applications.sections.responses")}</span>
                  </h3>
                  <p className="text-xs text-slate-400 py-1">
                    {t("applications.noResponses")}
                  </p>
                </div>
              )}

              {/* 5. Notes */}
              {overviewSections.notes && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("applications.sections.notes")}</span>
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
                      placeholder={t("applications.notePlaceholder")}
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
                        {t("common.save")}
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
                    <span>{t("applications.sections.properties")}</span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
                    <button
                      type="button"
                      disabled
                      className="opacity-50 cursor-not-allowed transition-colors"
                      title="Properties (Coming soon)"
                    >
                      {t("applications.addOrgProperty")}
                    </button>
                    <button
                      type="button"
                      disabled
                      className="opacity-50 cursor-not-allowed transition-colors"
                      title="Properties (Coming soon)"
                    >
                      {t("applications.manageJobProperties")}
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
                <span>{t("applications.noAiAnalysis")}</span>
              </div>
              <button
                type="button"
                className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                <span>{t("applications.runAnalysis")}</span>
              </button>
            </div>
          )}

          {activeTab === "interviews" && (() => {
            const scheduled = parseInterviewFromNotes(app?.notes);
            if (!scheduled) {
              return (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
                  <Calendar className="h-8 w-8 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t("applications.noInterviews")}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {t("applications.noInterviewsDesc")}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setScheduleModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t("applications.scheduleInterview")}</span>
                  </Button>
                </div>
              );
            }

            return (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {scheduled.type}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Lịch phỏng vấn đã được xác nhận
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-900/60">
                    Đã lên lịch
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 block">Thời gian:</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      {scheduled.date} lúc {scheduled.time}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 block">Hình thức:</span>
                    {scheduled.format === "OFFICE" ? (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">Tại văn phòng công ty</span>
                    ) : (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Trực tuyến ({scheduled.format})</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 block">Người phỏng vấn:</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {scheduled.interviewer}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 block">
                      {scheduled.format === "OFFICE" ? "Địa điểm:" : "Đường dẫn phòng họp:"}
                    </span>
                    {scheduled.linkOrLocation.startsWith("http") ? (
                      <a
                        href={scheduled.linkOrLocation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Vào phòng họp</span>
                      </a>
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {scheduled.linkOrLocation || "—"}
                      </span>
                    )}
                  </div>
                </div>

                {scheduled.notes && (
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                    <span className="font-bold text-blue-950 dark:text-blue-200">Ghi chú kèm theo:</span>
                    <p className="text-blue-800 dark:text-blue-300">{scheduled.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelInterview}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                  >
                    Hủy lịch hẹn
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScheduleModalOpen(true)}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    Chỉnh sửa lịch phỏng vấn
                  </Button>
                </div>
              </div>
            );
          })()}

          {activeTab === "responses" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("applications.sections.responses")}</span>
              </h3>
              <p className="text-xs text-slate-400 py-1">
                {t("applications.noResponses")}
              </p>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("applications.sections.notes")}</span>
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
                  placeholder={t("applications.notePlaceholder")}
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
                    {t("common.save")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeTab === "properties" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("applications.sections.properties")}</span>
              </h3>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
                <button
                  type="button"
                  className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {t("applications.addOrgProperty")}
                </button>
                <button
                  type="button"
                  className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {t("applications.manageJobProperties")}
                </button>
              </div>
            </div>
          )}

          {activeTab === "inbox" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-2">
              <Mail className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("applications.noMessagesYet")}
              </h4>
              <p className="text-[11px] text-slate-400">
                {t("applications.noMessagesYetDesc")}
              </p>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-2">
              <History className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("applications.timelineTitle")}
              </h4>
              <p className="text-[11px] text-slate-400">
                {t("applications.appliedOn")} {appliedDate}
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

      {/* Schedule Interview Modal */}
      {app && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          jobs={jobs}
          applications={applications}
          selectedJobId={app.jobId || undefined}
          selectedApplicationId={app.id}
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
