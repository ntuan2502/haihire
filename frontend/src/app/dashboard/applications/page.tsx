"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useJobs,
  useAllApplications,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Search,
  FileText,
  SlidersHorizontal,
  Columns3,
  Maximize2,
  ChevronDown,
  ArrowUpDown,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  ArrowLeftRight,
  X,
  ExternalLink,
  Calendar,
  Clock,
  Sparkles,
  MessageSquare,
  ArrowRight,
  History,
  FileCheck,
  Building2,
  Trash2,
} from "lucide-react";
import type { Application, ApplicationStage, CandidateDocument } from "@/types";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import { PIPELINE_STAGES } from "@/lib/stages";
import { StageBadge } from "@/components/ui/stage-badge";

import {
  getInitials,
  formatRelativeTime,
  formatDate,
  getStageInfo,
  getCandidateDisplayName,
  parseCandidateDocuments,
  fixUtf8String,
} from "@/lib/utils";

type SortField = "candidate" | "email" | "job" | "status" | "score" | "applied";
type SortDirection = "asc" | "desc";

function ApplicationsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: rawApplications = [], isLoading: appsLoading } =
    useAllApplications();

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();

  const [search, setSearch] = useState("");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  // Selected Application for Right Slide-over Sidebar Drawer
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [deleteModalApp, setDeleteModalApp] = useState<Application | null>(null);
  const [drawerTab, setDrawerTab] = useState<string>("overview");
  const [drawerNoteInput, setDrawerNoteInput] = useState("");
  const [drawerNotesList, setDrawerNotesList] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drawer Overview sections visibility state
  const [drawerOverviewSections, setDrawerOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isDrawerOverviewPopoverOpen, setIsDrawerOverviewPopoverOpen] =
    useState(false);
  const drawerOverviewBtnRef = useRef<HTMLButtonElement>(null);
  const [drawerPreviewDoc, setDrawerPreviewDoc] =
    useState<CandidateDocument | null>(null);

  const drawerCandidateDocuments = useMemo(() => {
    if (!selectedApp) return [];
    const seenUrls = new Set<string>();
    const allDocs: CandidateDocument[] = [];
    const relatedApps = rawApplications.filter(
      (a) => a.candidateEmail && a.candidateEmail === selectedApp.candidateEmail,
    );
    const appsToScan = relatedApps.length > 0 ? relatedApps : [selectedApp];

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
  }, [selectedApp, rawApplications]);

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

  // Column Visibility Toggle State & Ref
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

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("applied");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination State
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const activeJobId = jobs.length > 0 ? jobs[0].id : null;
  const loading = jobsLoading || appsLoading;

  // Only consider records with valid jobId as active job applications
  const applications = useMemo(() => {
    return rawApplications.filter(
      (a) => Boolean(a.jobId && String(a.jobId).trim() !== ""),
    );
  }, [rawApplications]);

  // Create Job Map for Fast Lookup
  const jobMap = useMemo(() => {
    const map = new Map<string, (typeof jobs)[0]>();
    jobs.forEach((j) => map.set(j.id, j));
    return map;
  }, [jobs]);

  // Filter & Sort
  const filteredApps = useMemo(() => {
    return applications
      .filter((app) => {
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
  }, [applications, search, jobMap, sortField, sortDirection]);

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
    if (!selectedApp) return;
    try {
      await updateStageMutation.mutateAsync({
        id: selectedApp.id,
        stage: newStage,
      });
      setSelectedApp((prev) => (prev ? { ...prev, stage: newStage } : null));
    } catch (err) {
      console.error("Failed to update stage:", err);
    }
  };

  const selectedJob = selectedApp?.jobId ? jobMap.get(selectedApp.jobId) : null;
  const selectedJobTitle = selectedJob
    ? `${selectedJob.title} (${selectedJob.type === "FULL_TIME" ? "Full-Time" : selectedJob.type === "PART_TIME" ? "Part-Time" : selectedJob.type})`
    : selectedApp?.jobId
      ? `Job #${selectedApp.jobId}`
      : "Unassigned Role";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={rawApplications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-4">
        {/* Applications Toolbar matching Screenshot 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by candidate name, email, or job title..."
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
                className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <span>Views</span>
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
                <span>Columns</span>
              </button>

              {isColumnsOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl p-2 z-50">
                  <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
                    TOGGLE COLUMNS
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {[
                      { id: "candidate", label: "Candidate", locked: true },
                      { id: "email", label: "Email" },
                      { id: "job", label: "Job" },
                      { id: "status", label: "Status" },
                      { id: "score", label: "Score" },
                      { id: "applied", label: "Applied" },
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
              className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Filters</span>
            </button>

            {/* Compare / Swap Icon */}
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer inline-flex items-center justify-center transition-colors"
              title="Compare"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>

            {/* Fullscreen Icon */}
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer inline-flex items-center justify-center transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingSpinner />
        ) : applications.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
              <FileText className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No applications yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
              Applications will appear here when candidates apply to your jobs or when you apply candidates to jobs.
            </p>
            <Button
              onClick={() => router.push("/dashboard/jobs")}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              View Active Jobs
            </Button>
          </div>
        ) : (
          /* Main Applications Table View matching Screenshot 1 */
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
                          Candidate
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
                          Email
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
                          Job
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
                          Status
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
                          Score
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
                          Applied
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
                                {job?.title || "Role"}{" "}
                                <span className="text-slate-400">
                                  ({job?.type === "FULL_TIME" ? "Full-Time" : job?.type === "PART_TIME" ? "Part-Time" : job?.type || "Full-Time"})
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

            {/* Pagination & Rows Footer matching Screenshot 1 */}
            <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-50/30 dark:bg-slate-950/30">
              {/* Left: Showing X-Y of Z and Rows selector */}
              <div className="flex items-center gap-3">
                <span>
                  Showing {totalCount > 0 ? startIndex + 1 : 0}-
                  {Math.min(startIndex + rowsPerPage, totalCount)} of {totalCount}{" "}
                  application{totalCount > 1 ? "s" : ""}
                </span>

                <div className="flex items-center gap-1.5">
                  <span>Rows</span>
                  <Select
                    value={String(rowsPerPage)}
                    onValueChange={(val) => {
                      setRowsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 px-2 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-lg">
                      <SelectValue placeholder="20" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10" className="text-xs">
                        10
                      </SelectItem>
                      <SelectItem value="20" className="text-xs">
                        20
                      </SelectItem>
                      <SelectItem value="50" className="text-xs">
                        50
                      </SelectItem>
                      <SelectItem value="100" className="text-xs">
                        100
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right: Page X of Y and Next/Prev buttons */}
              <div className="flex items-center gap-2">
                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer shadow-xs"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer shadow-xs"
                    title="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Sidebar Drawer: Application Detail (Screenshot 2) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedApp(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
              <div className="p-6 space-y-5 flex-1">
                {/* Drawer Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Application Detail
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/applications/${selectedApp.id}`)
                      }
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Open full page"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      <span>Open full page</span>
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

                {/* Stage Action Pipeline Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Left: Stage pipeline buttons (All stages except current) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {PIPELINE_STAGES.filter(
                      (stage) => stage.id !== selectedApp.stage,
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

                  {/* Right: Quick actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Schedule Interview</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setDeleteModalApp(selectedApp)}
                      className="h-8 px-3 rounded-lg border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete application</span>
                    </button>
                  </div>
                </div>

                {/* Candidate Header Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                    {getInitials(selectedApp.candidateName)}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {selectedApp.candidateName}
                      </h2>
                      <StageBadge stage={selectedApp.stage} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {selectedApp.candidateEmail}
                      </span>
                      {selectedApp.candidatePhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {selectedApp.candidatePhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold truncate">
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        {selectedJobTitle}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>Applied {formatDate(selectedApp.createdAt)}</span>
                    </p>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
                  {/* Overview Tab with conditional arrow & sections dropdown */}
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
                      Overview
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
                    { id: "inbox", label: "Inbox" },
                    { id: "ai", label: "AI Analysis" },
                    { id: "interviews", label: "Interviews" },
                    {
                      id: "documents",
                      label: `Documents (${drawerCandidateDocuments.length})`,
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
                    <>
                      {/* 1. AI Analysis Banner */}
                      {drawerOverviewSections.ai && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300 font-medium">
                            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>No AI analysis yet</span>
                          </div>
                          <button
                            type="button"
                            className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Run Analysis</span>
                          </button>
                        </div>
                      )}

                      {/* 2. Interviews Card */}
                      {drawerOverviewSections.interviews && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>Interviews</span>
                            </h3>
                            <button
                              type="button"
                              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                            >
                              <span>+ Schedule Interview</span>
                            </button>
                          </div>

                          <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
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

                      {/* 3. Documents Card (Reused Component) */}
                      {drawerOverviewSections.documents && (
                        <ApplicationDocumentsSection
                          documents={drawerCandidateDocuments}
                          appId={selectedApp.id}
                          onPreview={(doc) => setDrawerPreviewDoc(doc)}
                          onDownload={handleDownloadDoc}
                        />
                      )}

                      {/* 4. Responses Card */}
                      {drawerOverviewSections.responses && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-1.5">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                            <span>Responses</span>
                          </h3>
                          <p className="text-xs text-slate-400 py-1">
                            No application form responses.
                          </p>
                        </div>
                      )}

                      {/* 5. Notes Card */}
                      {drawerOverviewSections.notes && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                            <span>Notes</span>
                          </h3>

                          {drawerNotesList.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {drawerNotesList.map((note, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
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
                              value={drawerNoteInput}
                              onChange={(e) => setDrawerNoteInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && drawerNoteInput.trim()) {
                                  setDrawerNotesList((prev) => [
                                    ...prev,
                                    drawerNoteInput.trim(),
                                  ]);
                                  setDrawerNoteInput("");
                                }
                              }}
                              className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            />
                            {drawerNoteInput.trim() && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (drawerNoteInput.trim()) {
                                    setDrawerNotesList((prev) => [
                                      ...prev,
                                      drawerNoteInput.trim(),
                                    ]);
                                    setDrawerNoteInput("");
                                  }
                                }}
                                className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                              >
                                Save
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 6. Properties Card */}
                      {drawerOverviewSections.properties && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
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
                    </>
                  )}

                  {/* Documents Tab: Reused component */}
                  {drawerTab === "documents" && (
                    <ApplicationDocumentsSection
                      documents={drawerCandidateDocuments}
                      appId={selectedApp.id}
                      onPreview={(doc) => setDrawerPreviewDoc(doc)}
                      onDownload={handleDownloadDoc}
                    />
                  )}

                  {/* Individual Tab Contents in Drawer */}
                  {drawerTab === "ai" && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300 font-medium">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>No AI analysis yet</span>
                      </div>
                      <button
                        type="button"
                        className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Run Analysis</span>
                      </button>
                    </div>
                  )}

                  {drawerTab === "interviews" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Interviews</span>
                        </h3>
                        <button
                          type="button"
                          className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                        >
                          <span>+ Schedule Interview</span>
                        </button>
                      </div>

                      <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
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

                  {drawerTab === "responses" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-1.5">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>Responses</span>
                      </h3>
                      <p className="text-xs text-slate-400 py-1">
                        No application form responses.
                      </p>
                    </div>
                  )}

                  {drawerTab === "notes" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                        <span>Notes</span>
                      </h3>

                      {drawerNotesList.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {drawerNotesList.map((note, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
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
                          value={drawerNoteInput}
                          onChange={(e) => setDrawerNoteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && drawerNoteInput.trim()) {
                              setDrawerNotesList((prev) => [
                                ...prev,
                                drawerNoteInput.trim(),
                              ]);
                              setDrawerNoteInput("");
                            }
                          }}
                          className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                        {drawerNoteInput.trim() && (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (drawerNoteInput.trim()) {
                                setDrawerNotesList((prev) => [
                                  ...prev,
                                  drawerNoteInput.trim(),
                                ]);
                                setDrawerNoteInput("");
                              }
                            }}
                            className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                          >
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {drawerTab === "properties" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
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

                  {drawerTab === "inbox" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-1.5">
                      <Mail className="h-6 w-6 text-slate-400 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        No messages yet
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Email communications will appear here.
                      </p>
                    </div>
                  )}

                  {drawerTab === "timeline" && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-1.5">
                      <History className="h-6 w-6 text-slate-400 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Application Timeline
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Applied on {formatDate(selectedApp.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!drawerPreviewDoc}
        onClose={() => setDrawerPreviewDoc(null)}
        document={drawerPreviewDoc}
        appId={selectedApp?.id}
        onDownload={handleDownloadDoc}
      />

      {/* Delete Application Confirmation Modal */}
      {deleteModalApp && (
        <DeleteApplicationModal
          isOpen={Boolean(deleteModalApp)}
          onClose={() => setDeleteModalApp(null)}
          onConfirm={handleConfirmDelete}
          candidateName={getCandidateDisplayName(deleteModalApp)}
          jobTitle={
            deleteModalApp.jobId && jobMap.get(deleteModalApp.jobId)
              ? `${jobMap.get(deleteModalApp.jobId)!.title} (${
                  jobMap.get(deleteModalApp.jobId)!.type === "FULL_TIME"
                    ? "Full-Time"
                    : jobMap.get(deleteModalApp.jobId)!.type === "PART_TIME"
                      ? "Part-Time"
                      : jobMap.get(deleteModalApp.jobId)!.type
                })`
              : "this position"
          }
          isDeleting={isDeleting}
        />
      )}

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
        selectedJobId={activeJobId}
      />

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
      />
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <AuthGuard>
      <ApplicationsPageContent />
    </AuthGuard>
  );
}
