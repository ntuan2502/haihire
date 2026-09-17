"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ArrowLeftRight,
  Maximize2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUpDown,
  Mail,
  Building2,
  Calendar,
  Trash2,
  ExternalLink,
  X,
  Phone,
  ArrowRight,
  Clock,
  Sparkles,
  Columns3,
  FileText,
  MessageSquare,
  FileCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CustomSelect } from "@/components/shared/custom-select";
import { StageBadge } from "@/components/shared/stage-badge";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import {
  getInterviewsFromApplication,
} from "@/lib/interviews";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import { PIPELINE_STAGES } from "@/lib/stages";
import { getApiBaseUrl } from "@/lib/api";
import {
  useUpdateStageMutation,
  useDeleteApplicationMutation,
  useUpdateCandidateMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import {
  getInitials,
  formatRelativeTime,
  formatDate,
  getStageInfo,
  parseCandidateNotes,
  parseCandidateDocuments,
  fixUtf8String,
} from "@/lib/utils";
import { getJobTypeLabel } from "@/lib/jobs";
import type { Job, Application, ApplicationStage, CandidateDocument } from "@/types";
import { useI18n } from "@/i18n";
import { useAuth } from "@/context/auth-context";

type SortField = "candidate" | "email" | "job" | "status" | "score" | "applied";
type SortDirection = "asc" | "desc";

interface ApplicationsDataTableProps {
  applications: Application[];
  jobs: Job[];
  loading?: boolean;
  fixedJobId?: string;
  onViewInPipeline?: (appId: string, stage: ApplicationStage) => void;
}

export function ApplicationsDataTable({
  applications: initialApplications,
  jobs,
  loading = false,
  fixedJobId,
  onViewInPipeline,
}: ApplicationsDataTableProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { canEdit } = useAuth();
  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();
  const updateCandidateMutation = useUpdateCandidateMutation();
  const deleteInterviewMutation = useDeleteInterviewMutation();

  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [deleteModalApp, setDeleteModalApp] = useState<Application | null>(null);
  const [drawerTab, setDrawerTab] = useState<string>("overview");
  const [drawerNoteInput, setDrawerNoteInput] = useState("");
  const [drawerNotesList, setDrawerNotesList] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Drawer Overview sections visibility state
  const [drawerOverviewSections, setDrawerOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isDrawerOverviewPopoverOpen, setIsDrawerOverviewPopoverOpen] =
    useState(false);
  const drawerOverviewBtnRef = useRef<HTMLButtonElement>(null);
  const [drawerPreviewDoc, setDrawerPreviewDoc] =
    useState<CandidateDocument | null>(null);

  // Get current selected application directly to ensure fresh state after updates
  const currentApp = useMemo(() => {
    if (!selectedApp) return null;
    return (
      initialApplications.find((a) => a.id === selectedApp.id) || selectedApp
    );
  }, [selectedApp, initialApplications]);

  const allScheduledInterviews = useMemo(() => {
    return getInterviewsFromApplication(currentApp);
  }, [currentApp]);

  useEffect(() => {
    if (currentApp?.notes) {
      const { customNotes } = parseCandidateNotes(
        currentApp.notes,
        currentApp.candidateName,
      );
      const noteText = customNotes || currentApp.notes;
      const items = noteText.split(/\s*\|\s*|\n+/).filter(Boolean);
      setDrawerNotesList(items);
    } else {
      setDrawerNotesList([]);
    }
  }, [currentApp?.notes, currentApp?.candidateName]);

  const handleAddDrawerNote = async () => {
    if (!drawerNoteInput.trim() || !currentApp) return;
    const trimmed = drawerNoteInput.trim();
    const updated = [trimmed, ...drawerNotesList];
    setDrawerNotesList(updated);
    setDrawerNoteInput("");
    try {
      await updateCandidateMutation.mutateAsync({
        id: currentApp.id,
        data: {
          notes: updated.join(" | "),
        },
      });
      setSelectedApp((prev) =>
        prev ? { ...prev, notes: updated.join(" | ") } : null,
      );
    } catch (err) {
      console.error("Failed to save drawer application note:", err);
    }
  };

  const handleCancelInterview = async (interviewId?: string) => {
    if (!currentApp) return;
    try {
      const targetId = interviewId || (currentApp.interviews && currentApp.interviews[0]?.id);
      if (targetId) {
        await deleteInterviewMutation.mutateAsync(targetId);
      }
    } catch (err) {
      console.error("Failed to cancel interview:", err);
    }
  };

  // Column Visibility Toggle State
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    candidate: true,
    email: true,
    job: true,
    status: true,
    score: true,
    applied: true,
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    if (key === "candidate") return;
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnsRef.current &&
        !columnsRef.current.contains(event.target as Node)
      ) {
        setIsColumnsOpen(false);
      }
    }
    if (isColumnsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isColumnsOpen]);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("applied");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination State
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Job Map for Fast Lookup
  const jobMap = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach((j) => map.set(j.id, j));
    return map;
  }, [jobs]);

  const baseApplications = useMemo(() => {
    if (!fixedJobId) {
      return initialApplications;
    }
    return initialApplications.filter(
      (a) => String(a.jobId) === String(fixedJobId),
    );
  }, [initialApplications, fixedJobId]);

  // Filter & Sort
  const filteredApps = useMemo(() => {
    return baseApplications
      .filter((app) => {
        // Search query
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        const job = app.jobId ? jobMap.get(app.jobId) : null;
        return (
          app.candidateName.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q) ||
          (app.candidatePhone && app.candidatePhone.toLowerCase().includes(q)) ||
          (job && job.title.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const jobA = a.jobId ? jobMap.get(a.jobId)?.title || "" : "";
        const jobB = b.jobId ? jobMap.get(b.jobId)?.title || "" : "";

        let diff = 0;
        switch (sortField) {
          case "candidate":
            diff = a.candidateName.localeCompare(b.candidateName);
            break;
          case "email":
            diff = a.candidateEmail.localeCompare(b.candidateEmail);
            break;
          case "job":
            diff = jobA.localeCompare(jobB);
            break;
          case "status":
            diff = a.stage.localeCompare(b.stage);
            break;
          case "score":
            diff = 0;
            break;
          case "applied":
          default:
            diff =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        return sortDirection === "asc" ? diff : -diff;
      });
  }, [baseApplications, search, jobMap, sortField, sortDirection]);

  // Pagination Slice
  const totalCount = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedApps = filteredApps.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };


  const handleStageChange = async (newStage: ApplicationStage) => {
    if (!currentApp) return;
    try {
      await updateStageMutation.mutateAsync({
        id: currentApp.id,
        stage: newStage,
      });
      setSelectedApp((prev) => (prev ? { ...prev, stage: newStage } : null));
    } catch (err) {
      console.error("Failed to update stage:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalApp) return;
    try {
      setIsDeleting(true);
      await deleteAppMutation.mutateAsync(deleteModalApp.id);
      if (selectedApp?.id === deleteModalApp.id) {
        setSelectedApp(null);
      }
      setDeleteModalApp(null);
    } catch (err) {
      console.error("Failed to delete application:", err);
    } finally {
      setIsDeleting(false);
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
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const activeAppId = targetAppId || selectedApp?.id;
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

  const drawerCandidateDocuments = useMemo(() => {
    if (!currentApp) return [];
    const seenUrls = new Set<string>();
    const allDocs: CandidateDocument[] = [];
    const relatedApps = initialApplications.filter(
      (a) => a.candidateEmail && a.candidateEmail === currentApp.candidateEmail,
    );
    const appsToScan = relatedApps.length > 0 ? relatedApps : [currentApp];

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
  }, [currentApp, initialApplications]);

  const selectedJob = currentApp?.jobId ? jobMap.get(currentApp.jobId) : null;
  const selectedJobTitle = selectedJob
    ? `${selectedJob.title} (${selectedJob.type === "FULL_TIME" ? t("jobs.fullTime") : selectedJob.type === "PART_TIME" ? t("jobs.partTime") : selectedJob.type})`
    : currentApp?.jobId
      ? `${t("jobs.jobTitle")} #${currentApp.jobId}`
      : t("candidates.role");

  return (
    <div className="space-y-4">
      {/* Applications Toolbar matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1 min-w-0 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder={t("applications.searchApplications")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 pl-9 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Views Button */}
          <div className="relative">
            <button
              type="button"
              disabled
              className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 shadow-xs cursor-not-allowed opacity-50 flex items-center gap-1.5 transition-colors"
              title={`${t("applications.views")} (Coming soon)`}
            >
              <span>{t("applications.views")}</span>
              <ChevronDown className="h-3 w-3 text-slate-400 opacity-70" />
            </button>
          </div>

          {/* Columns Dropdown matching Screenshot */}
          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setIsColumnsOpen((prev) => !prev)}
              className={`h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                isColumnsOpen ? "ring-2 ring-blue-500/20 border-blue-500" : ""
              }`}
            >
              <Columns3 className="h-3.5 w-3.5 text-slate-500" />
              <span>{t("common.columns")}</span>
            </button>

            {isColumnsOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl p-2 z-50">
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
                  {t("applications.columnsToggle")}
                </div>
                <div className="space-y-0.5 mt-1">
                  {[
                    { id: "candidate", label: t("applications.columns.candidate"), locked: true },
                    { id: "email", label: t("applications.columns.email") },
                    { id: "job", label: t("applications.columns.job") },
                    { id: "status", label: t("applications.columns.status") },
                    { id: "score", label: t("applications.columns.score") },
                    { id: "applied", label: t("applications.columns.applied") },
                  ].map((col) => {
                    const isChecked =
                      visibleColumns[col.id as keyof typeof visibleColumns];
                    const isLocked = col.locked;
                    return (
                      <label
                        key={col.id}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs font-semibold select-none transition-colors ${
                          isLocked
                            ? "opacity-60 cursor-not-allowed text-slate-500 dark:text-slate-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() =>
                            toggleColumn(
                              col.id as keyof typeof visibleColumns,
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <button
            type="button"
            disabled
            className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 shadow-xs cursor-not-allowed opacity-50 flex items-center gap-1.5 transition-colors"
            title={`${t("applications.filters")} (Coming soon)`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>{t("applications.filters")}</span>
          </button>

          {/* Compare / Swap Icon */}
          <button
            type="button"
            disabled
            className="h-9 w-9 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400 shadow-xs cursor-not-allowed opacity-50 inline-flex items-center justify-center transition-colors"
            title={`${t("applications.compare")} (Coming soon)`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Icon */}
          <button
            type="button"
            disabled
            className="h-9 w-9 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400 shadow-xs cursor-not-allowed opacity-50 inline-flex items-center justify-center transition-colors"
            title={`${t("applications.fullscreen")} (Coming soon)`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingSpinner />
      ) : baseApplications.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
            <FileText className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t("applications.noApplicationsYet")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
            {t("applications.noApplicationsYetDesc")}
          </p>
          <Button
            onClick={() => router.push("/dashboard/jobs")}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
          >
            {t("applications.viewActiveJobs")}
          </Button>
        </div>
      ) : (
        /* Applications Data Table */
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              {/* Table Header */}
              <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500">
                <tr>
                  {/* Candidate */}
                  {visibleColumns.candidate && (
                    <th
                      onClick={() => handleSort("candidate")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        {t("applications.columns.candidate")}
                        {sortField === "candidate" ? (
                          <ArrowDown
                            className={`h-3 w-3 transition-transform ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </span>
                    </th>
                  )}

                  {/* Email */}
                  {visibleColumns.email && (
                    <th
                      onClick={() => handleSort("email")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        {t("applications.columns.email")}
                        {sortField === "email" ? (
                          <ArrowDown
                            className={`h-3 w-3 transition-transform ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </span>
                    </th>
                  )}

                  {/* Job */}
                  {visibleColumns.job && (
                    <th
                      onClick={() => handleSort("job")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        {t("applications.columns.job")}
                        {sortField === "job" ? (
                          <ArrowDown
                            className={`h-3 w-3 transition-transform ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </span>
                    </th>
                  )}

                  {/* Status */}
                  {visibleColumns.status && (
                    <th
                      onClick={() => handleSort("status")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        {t("applications.columns.status")}
                        {sortField === "status" ? (
                          <ArrowDown
                            className={`h-3 w-3 transition-transform ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </span>
                    </th>
                  )}

                  {/* Score */}
                  {visibleColumns.score && (
                    <th
                      onClick={() => handleSort("score")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        {t("applications.columns.score")}
                        {sortField === "score" ? (
                          <ArrowDown
                            className={`h-3 w-3 transition-transform ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </span>
                    </th>
                  )}

                  {/* Applied */}
                  {visibleColumns.applied && (
                    <th
                      onClick={() => handleSort("applied")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                        {t("applications.columns.applied")}
                        {sortField === "applied" ? (
                          <ArrowDown
                            className={`h-3 w-3 text-slate-700 dark:text-slate-300 transition-transform ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </span>
                    </th>
                  )}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedApps.map((application) => {
                  const job = application.jobId
                    ? jobMap.get(application.jobId)
                    : null;
                  const stageInfo = getStageInfo(application.stage);

                  return (
                    <tr
                      key={application.id}
                      onClick={() => setSelectedApp(application)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      {/* Candidate Name */}
                      {visibleColumns.candidate && (
                        <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                          <span className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {application.candidateName}
                          </span>
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.email && (
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{application.candidateEmail}</span>
                          </span>
                        </td>
                      )}

                      {/* Job */}
                      {visibleColumns.job && (
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                              {job?.title || t("candidates.role")}{" "}
                              <span className="text-slate-400">
                                ({getJobTypeLabel(job?.type, t)})
                              </span>
                            </span>
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${stageInfo.dotColor}`}
                            />
                            <span>{stageInfo.label}</span>
                          </span>
                        </td>
                      )}

                      {/* Score */}
                      {visibleColumns.score && (
                        <td className="py-4 px-5 text-slate-400">—</td>
                      )}

                      {/* Applied */}
                      {visibleColumns.applied && (
                        <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                          {formatRelativeTime(application.createdAt)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination & Rows Footer */}
          <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-50/30 dark:bg-slate-950/30">
            <div className="flex items-center gap-3">
              <span>
                {t("common.showing")} {totalCount > 0 ? startIndex + 1 : 0}-
                {Math.min(startIndex + rowsPerPage, totalCount)} {t("common.of")} {totalCount}{" "}
                {t("nav.applications").toLowerCase()}
              </span>

              <div className="flex items-center gap-1.5">
                <span>{t("common.rows")}</span>
                <CustomSelect
                  value={String(rowsPerPage)}
                  onChange={(val) => {
                    setRowsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  size="sm"
                  triggerClassName="h-7 px-2 text-xs font-normal bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-lg min-w-[60px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="mr-1">
                {t("common.page")} {currentPage} {t("common.of")} {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 rounded-lg border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 rounded-lg border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Drawer Slide-over */}
      {selectedApp && currentApp && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedApp(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <aside className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-slate-800 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Drawer Top Navigation Bar */}
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  <span>{t("applications.backToTable")}</span>
                </button>

                <div className="flex items-center gap-2">
                  {onViewInPipeline && (
                    <button
                      type="button"
                      onClick={() => {
                        onViewInPipeline(currentApp.id, currentApp.stage);
                        setSelectedApp(null);
                      }}
                      className="h-8 px-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Focus candidate in Pipeline"
                    >
                      <Columns3 className="h-3.5 w-3.5" />
                      <span>{t("applications.viewInPipeline")}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/applications/${currentApp.id}`)
                    }
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={t("applications.openFullPage")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("applications.openFullPage")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedApp(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Stage Action Pipeline Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {PIPELINE_STAGES.filter(
                      (stage) => stage.id !== currentApp.stage,
                    ).map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => handleStageChange(stage.id)}
                        disabled={updateStageMutation.isPending}
                        className={`h-8 px-3 rounded-lg ${stage.btnBg} ${stage.btnHover} text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50`}
                      >
                        <span>{stage.actionLabel}</span>
                        <span className="h-4 w-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                          {stage.stepNumber}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t("applications.scheduleInterview")}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setDeleteModalApp(currentApp)}
                      className="h-8 px-3 rounded-lg border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t("applications.deleteApplication")}</span>
                    </button>
                  </div>
                </div>

                {/* Candidate Header Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                    {getInitials(currentApp.candidateName)}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {currentApp.candidateName}
                      </h2>
                      <StageBadge stage={currentApp.stage} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {currentApp.candidateEmail}
                      </span>
                      {currentApp.candidatePhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {currentApp.candidatePhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold truncate">
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        {selectedJobTitle}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{t("applications.applied")} {formatDate(currentApp.createdAt)}</span>
                    </p>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
                  <div
                    className={`relative flex items-center border-b-2 -mb-[1px] transition-colors ${
                      drawerTab === "overview"
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerTab("overview");
                        setIsDrawerOverviewPopoverOpen(false);
                      }}
                      className={`py-2 cursor-pointer whitespace-nowrap ${
                        drawerTab === "overview" ? "pl-3 pr-1" : "px-3"
                      }`}
                    >
                      {t("applications.tabs.overview")}
                    </button>

                    {drawerTab === "overview" && (
                      <button
                        ref={drawerOverviewBtnRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDrawerOverviewPopoverOpen((prev) => !prev);
                        }}
                        className="py-2 pr-2 pl-0.5 cursor-pointer flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        aria-label="Toggle overview sections"
                        title="Toggle overview sections"
                      >
                        <ChevronDown
                          className={`h-3 w-3 transition-transform duration-200 ${
                            isDrawerOverviewPopoverOpen
                              ? "rotate-180"
                              : "rotate-0"
                          }`}
                        />
                      </button>
                    )}

                    <OverviewSectionsPopover
                      isOpen={isDrawerOverviewPopoverOpen}
                      onClose={() => setIsDrawerOverviewPopoverOpen(false)}
                      sections={drawerOverviewSections}
                      onToggleSection={(key) =>
                        setDrawerOverviewSections((prev) => ({
                          ...prev,
                          [key]: !prev[key],
                        }))
                      }
                      triggerRef={drawerOverviewBtnRef}
                    />
                  </div>

                  {[
                    { id: "inbox", label: t("applications.tabs.inbox") },
                    { id: "ai", label: t("applications.tabs.ai") },
                    {
                      id: "interviews",
                      label:
                        allScheduledInterviews.length > 0
                          ? `${t("applications.tabs.interviews")} (${allScheduledInterviews.length})`
                          : t("applications.tabs.interviews"),
                    },
                    {
                      id: "documents",
                      label: `${t("applications.tabs.documents")} (${drawerCandidateDocuments.length})`,
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
                        setDrawerTab(tab.id);
                        setIsDrawerOverviewPopoverOpen(false);
                      }}
                      className={`px-3 py-2 flex items-center gap-1 whitespace-nowrap transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                        drawerTab === tab.id
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
                  {drawerTab === "overview" && (
                    <div className="space-y-4">
                      {/* Match Score Card */}
                      {drawerOverviewSections.ai && (
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">
                              {t("applications.matchScore")}:
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {currentApp.matchScore
                                ? `${currentApp.matchScore}%`
                                : "N/A"}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>{t("applications.runAnalysis")}</span>
                          </button>
                        </div>
                      )}
                      {/* Interviews Card */}
                      {drawerOverviewSections.interviews && (
                        <CandidateInterviewsList
                          application={currentApp}
                          notes={currentApp.notes}
                          onSchedule={() => setIsScheduleModalOpen(true)}
                          onCancelInterview={handleCancelInterview}
                          canEdit={canEdit}
                          title={t("applications.sections.interviews")}
                          showSectionHeader={true}
                        />
                      )}

                      {/* Documents Card */}
                      {drawerOverviewSections.documents && (
                        <ApplicationDocumentsSection
                          documents={drawerCandidateDocuments}
                          appId={currentApp.id}
                          onPreview={(doc) => setDrawerPreviewDoc(doc)}
                          onDownload={handleDownloadDoc}
                        />
                      )}

                      {/* Responses Card */}
                      {drawerOverviewSections.responses && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {t("applications.sections.responses")}
                          </h3>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-300">
                            <div>
                              <p className="text-[11px] text-slate-400">
                                {t("candidates.displayName")}
                              </p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {currentApp.candidateName}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">
                                {t("candidates.email")}
                              </p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {currentApp.candidateEmail}
                              </p>
                            </div>
                            {currentApp.candidatePhone && (
                              <div>
                                <p className="text-[11px] text-slate-400">
                                  {t("candidates.phone")}
                                </p>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {currentApp.candidatePhone}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes Card */}
                      {drawerOverviewSections.notes && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {t("applications.sections.notes")}
                          </h3>
                          <div className="space-y-2">
                            {drawerNotesList.length > 0 && (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {drawerNotesList.map((n, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
                                  >
                                    {n}
                                  </div>
                                ))}
                              </div>
                            )}
                            <textarea
                              value={drawerNoteInput}
                              onChange={(e) =>
                                setDrawerNoteInput(e.target.value)
                              }
                              placeholder={t("applications.notePlaceholder")}
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-20"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleAddDrawerNote}
                                className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                              >
                                {t("candidates.addNote")}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documents Tab Content */}
                  {drawerTab === "documents" && (
                    <ApplicationDocumentsSection
                      documents={drawerCandidateDocuments}
                      appId={currentApp.id}
                      onPreview={(doc) => setDrawerPreviewDoc(doc)}
                      onDownload={handleDownloadDoc}
                    />
                  )}

                  {/* Interviews Tab Content */}
                  {drawerTab === "interviews" && (
                    <CandidateInterviewsList
                      application={currentApp}
                      notes={currentApp.notes}
                      onSchedule={() => setIsScheduleModalOpen(true)}
                      onCancelInterview={handleCancelInterview}
                      canEdit={canEdit}
                      showSectionHeader={true}
                    />
                  )}

                  {/* AI Tab Content */}
                  {drawerTab === "ai" && (
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

                  {/* Responses Tab Content */}
                  {drawerTab === "responses" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t("applications.sections.responses")}</span>
                      </h3>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-300">
                        <div>
                          <p className="text-[11px] text-slate-400">
                            {t("candidates.displayName")}
                          </p>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {currentApp.candidateName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">
                            {t("candidates.email")}
                          </p>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {currentApp.candidateEmail}
                          </p>
                        </div>
                        {currentApp.candidatePhone && (
                          <div>
                            <p className="text-[11px] text-slate-400">
                              {t("candidates.phone")}
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {currentApp.candidatePhone}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes Tab Content */}
                  {drawerTab === "notes" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t("applications.sections.notes")}</span>
                      </h3>
                      {drawerNotesList.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {drawerNotesList.map((note, idx) => (
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
                          value={drawerNoteInput}
                          onChange={(e) => setDrawerNoteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAddDrawerNote();
                            }
                          }}
                          className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                        {drawerNoteInput.trim() && (
                          <Button
                            size="sm"
                            onClick={handleAddDrawerNote}
                            className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                          >
                            {t("candidates.addNote")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inbox Tab Content */}
                  {drawerTab === "inbox" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-2">
                      <Mail className="h-8 w-8 text-slate-400 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t("applications.tabs.inbox")}
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        {t("applications.noMessagesYetDesc")}
                      </p>
                    </div>
                  )}

                  {/* Timeline Tab Content */}
                  {drawerTab === "timeline" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t("applications.tabs.timeline")}</span>
                      </h3>
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        <div className="relative text-xs">
                          <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {t("applications.applied")}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(currentApp.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Properties Tab Content */}
                  {drawerTab === "properties" && (
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
                        >
                          {t("applications.addOrgProperty")}
                        </button>
                        <button
                          type="button"
                          disabled
                          className="opacity-50 cursor-not-allowed transition-colors"
                        >
                          {t("applications.manageJobProperties")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!drawerPreviewDoc}
        onClose={() => setDrawerPreviewDoc(null)}
        document={drawerPreviewDoc}
        appId={currentApp?.id}
        onDownload={handleDownloadDoc}
      />

      {/* Delete Application Modal */}
      {deleteModalApp && (
        <DeleteApplicationModal
          isOpen={true}
          onClose={() => setDeleteModalApp(null)}
          onConfirm={handleConfirmDelete}
          candidateName={deleteModalApp.candidateName}
          jobTitle={
            deleteModalApp.jobId && jobMap.get(deleteModalApp.jobId)
              ? `${jobMap.get(deleteModalApp.jobId)!.title} (${
                  jobMap.get(deleteModalApp.jobId)!.type === "FULL_TIME"
                    ? t("jobs.fullTime")
                    : jobMap.get(deleteModalApp.jobId)!.type === "PART_TIME"
                      ? t("jobs.partTime")
                      : jobMap.get(deleteModalApp.jobId)!.type
                })`
              : t("applications.applyingForPosition")
          }
          isDeleting={isDeleting}
        />
      )}

      {/* Schedule Interview Modal */}
      {currentApp && (
        <ScheduleInterviewModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          jobs={jobs}
          applications={baseApplications}
          selectedJobId={currentApp.jobId || undefined}
          selectedApplicationId={currentApp.id}
          onInterviewScheduled={() => {
            setSelectedApp((prev) => (prev ? { ...prev, stage: "INTERVIEW" } : null));
          }}
        />
      )}
    </div>
  );
}
