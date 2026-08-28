"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { ApplyToJobModal } from "@/components/candidates/apply-to-job-modal";
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
  useUploadDocumentMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Search,
  Users,
  Plus,
  SlidersHorizontal,
  Columns3,
  Maximize2,
  UploadCloud,
  ChevronDown,
  Mail,
  Phone,
  ArrowUpDown,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Calendar,
  Clock,
  Briefcase,
  FileText,
  Edit2,
  Loader2,
} from "lucide-react";

import {
  formatDate,
  formatFileSize,
  parseCandidateNotes,
  aggregateCandidates,
  type CandidateItem,
} from "@/lib/utils";

type SortField = "name" | "email" | "phone" | "applications" | "added";
type SortDirection = "asc" | "desc";

function CandidatesPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();
  const uploadDocumentMutation = useUploadDocumentMutation();

  const [search, setSearch] = useState("");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  // Selected Candidate for Right Slide-over Sidebar Drawer
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateItem | null>(null);
  const [applyToJobModalCandidate, setApplyToJobModalCandidate] =
    useState<CandidateItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<"applications" | "documents">(
    "applications",
  );
  const [drawerDocFilter, setDrawerDocFilter] = useState("Resume");
  const [drawerStageFilter, setDrawerStageFilter] = useState("ALL");
  const [isUploadingDrawerDoc, setIsUploadingDrawerDoc] = useState(false);
  const drawerDocInputRef = React.useRef<HTMLInputElement>(null);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("added");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination State
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const activeJobId = jobs.length > 0 ? jobs[0].id : null;
  const loading = jobsLoading || appsLoading;

  // Aggregate Candidates from Applications using shared utility
  const candidateRows: CandidateItem[] = useMemo(
    () => aggregateCandidates(applications),
    [applications],
  );

  // Filter & Sort
  const filteredCandidates = useMemo(() => {
    return candidateRows
      .filter((cand) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return (
          cand.name.toLowerCase().includes(q) ||
          cand.email.toLowerCase().includes(q) ||
          cand.phone.toLowerCase().includes(q) ||
          cand.notes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let diff = 0;
        switch (sortField) {
          case "name":
            diff = a.name.localeCompare(b.name);
            break;
          case "email":
            diff = a.email.localeCompare(b.email);
            break;
          case "phone":
            diff = a.phone.localeCompare(b.phone);
            break;
          case "applications":
            diff = a.applicationsCount - b.applicationsCount;
            break;
          case "added":
          default:
            diff =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        return sortDirection === "asc" ? diff : -diff;
      });
  }, [candidateRows, search, sortField, sortDirection]);

  // Pagination Slice
  const totalCount = filteredCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedCandidates = filteredCandidates.slice(
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



  // Find all applications of the selected candidate in drawer
  const selectedCandidateApps = useMemo(() => {
    if (!selectedCandidate) return [];
    return applications.filter(
      (a) =>
        a.jobId &&
        a.candidateEmail.toLowerCase() ===
        selectedCandidate.email.toLowerCase(),
    );
  }, [selectedCandidate, applications]);

  const filteredDrawerApps = useMemo(() => {
    if (drawerStageFilter === "ALL") return selectedCandidateApps;
    return selectedCandidateApps.filter((a) => a.stage === drawerStageFilter);
  }, [selectedCandidateApps, drawerStageFilter]);

  const selectedCandidateDetails = useMemo(() => {
    if (!selectedCandidate) {
      return {
        gender: "—",
        dob: "—",
        firstName: "—",
        lastName: "—",
        displayName: "—",
        effectiveName: "—",
        customNotes: "",
      };
    }
    return parseCandidateNotes(selectedCandidate.notes, selectedCandidate.name);
  }, [selectedCandidate]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="candidates"
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-4">
        {/* Candidates Toolbar matching Screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by name or email..."
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

            {/* Columns */}
            <button
              type="button"
              className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Columns3 className="h-3.5 w-3.5 text-slate-500" />
              <span>Columns</span>
            </button>

            {/* Filters */}
            <button
              type="button"
              className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Filters</span>
            </button>

            {/* Fullscreen icon */}
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer inline-flex items-center justify-center transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            {/* Import CSV */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/candidates/new")}
              className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
              <span>Import CSV</span>
            </button>

            {/* Add Candidate button */}
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/candidates/new")}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Add Candidate</span>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingSpinner />
        ) : candidateRows.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
              <Users className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No candidates yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
              Add your first candidate to start building your talent pool.
            </p>
            <Button
              onClick={() => router.push("/dashboard/candidates/new")}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Add Candidate
            </Button>
          </div>
        ) : (
          /* Main Candidates Table View matching Screenshot */
          <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Table Header */}
                <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500">
                  <tr>
                    <th
                      onClick={() => handleSort("name")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        Name
                        {sortField === "name" ? (
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
                    <th
                      onClick={() => handleSort("phone")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        Phone
                        {sortField === "phone" ? (
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
                    <th
                      onClick={() => handleSort("applications")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        Applications
                        {sortField === "applications" ? (
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
                    <th
                      onClick={() => handleSort("added")}
                      className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                        Added
                        {sortField === "added" ? (
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
                    <th className="py-3 px-5 font-semibold text-slate-500">
                      Quick notes
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      {/* Name */}
                      <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                        <span className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {candidate.name}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{candidate.email}</span>
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-5">
                        {candidate.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{candidate.phone}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Applications Count */}
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                        {candidate.applicationsCount}
                      </td>

                      {/* Added Date */}
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                        {formatDate(candidate.createdAt)}
                      </td>

                      {/* Quick notes - Empty as requested */}
                      <td className="py-4 px-5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination & Rows Footer matching Screenshot */}
            <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-50/30 dark:bg-slate-950/30">
              {/* Left: Showing X-Y of Z and Rows selector */}
              <div className="flex items-center gap-3">
                <span>
                  Showing {totalCount > 0 ? startIndex + 1 : 0}-
                  {Math.min(startIndex + rowsPerPage, totalCount)} of {totalCount}{" "}
                  candidate{totalCount > 1 ? "s" : ""}
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

      {/* Slide-over Sidebar Drawer: Candidate Detail (Screenshot 1) */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedCandidate(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
              <div className="p-6 space-y-5 flex-1">
                {/* Drawer Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Candidate Detail
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/candidates/${selectedCandidate.id}/edit`,
                        )
                      }
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Edit candidate"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/candidates/${selectedCandidate.id}`,
                        )
                      }
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Open full page"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      <span>Open full page</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCandidate(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Candidate Name & Contact Header */}
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedCandidate.name}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {selectedCandidate.email}
                    </span>
                    {selectedCandidate.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {selectedCandidate.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card 1: Details */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Details
                  </h3>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        First Name
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                        {selectedCandidateDetails.firstName || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        Last Name
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                        {selectedCandidateDetails.lastName || "—"}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-slate-400 text-[11px] block">
                        Display Name
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                        {selectedCandidateDetails.displayName || selectedCandidate.name || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        Email
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                        {selectedCandidate.email}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        Phone
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                        {selectedCandidate.phone || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        Gender
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                        {selectedCandidateDetails.gender}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        Date of Birth
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                        {selectedCandidateDetails.dob}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                        {formatDate(selectedCandidate.createdAt, "short")}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                        {formatDate(
                          selectedCandidate.updatedAt ||
                            selectedCandidate.createdAt,
                          "short",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Properties */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Properties
                  </h3>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add org-wide property</span>
                  </button>
                </div>

                {/* Card 3: Tabs */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  {/* Tabs Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-6 text-xs font-bold -mb-px">
                      <button
                        type="button"
                        onClick={() => setDrawerTab("applications")}
                        className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                          drawerTab === "applications"
                            ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                        }`}
                      >
                        Applications ({selectedCandidateApps.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerTab("documents")}
                        className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                          drawerTab === "documents"
                            ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                        }`}
                      >
                        Documents ({selectedCandidate.rawApp.resumeUrl ? 1 : 0})
                      </button>
                    </div>
                  </div>

                  {/* Tab Body */}
                  {drawerTab === "applications" && (
                    <div className="space-y-3">
                      {/* Applications Action Row */}
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={drawerStageFilter}
                          onValueChange={(v) => v && setDrawerStageFilter(v)}
                        >
                          <SelectTrigger className="h-7 w-28 text-[11px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                            <SelectValue placeholder="All stages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL" className="text-[11px]">
                              All stages
                            </SelectItem>
                            <SelectItem value="APPLIED" className="text-[11px]">
                              Applied
                            </SelectItem>
                            <SelectItem value="SCREENING" className="text-[11px]">
                              Screening
                            </SelectItem>
                            <SelectItem value="INTERVIEW" className="text-[11px]">
                              Interview
                            </SelectItem>
                            <SelectItem value="OFFER" className="text-[11px]">
                              Offer
                            </SelectItem>
                            <SelectItem value="HIRED" className="text-[11px]">
                              Hired
                            </SelectItem>
                            <SelectItem value="REJECTED" className="text-[11px]">
                              Rejected
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <button
                          type="button"
                          onClick={() => setApplyToJobModalCandidate(selectedCandidate)}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Apply to Job</span>
                        </button>
                      </div>

                      {filteredDrawerApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-1.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {selectedCandidateApps.length === 0
                              ? "No applications yet."
                              : "No applications matching this stage."}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {selectedCandidateApps.length === 0
                              ? "Apply this candidate to a job to start the hiring pipeline."
                              : "Try selecting a different stage filter."}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredDrawerApps.map((app) => {
                            const job = jobs.find((j) => j.id === app.jobId);
                            return (
                              <div
                                key={app.id}
                                className="py-2.5 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <h4 className="font-bold text-slate-900 dark:text-white">
                                    {job?.title || "Position"}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                    Stage: {app.stage} • Applied{" "}
                                    {formatDate(app.createdAt, "short")}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900">
                                  {app.stage}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documents Tab matching Screenshot 2 */}
                  {drawerTab === "documents" && (
                    <div className="space-y-3">
                      {/* Document Toolbar */}
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={drawerDocFilter}
                          onValueChange={(v) => v && setDrawerDocFilter(v)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                            <SelectValue placeholder="Resume" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Resume" className="text-xs">
                              Resume
                            </SelectItem>
                            <SelectItem value="Cover Letter" className="text-xs">
                              Cover Letter
                            </SelectItem>
                            <SelectItem value="Other" className="text-xs">
                              Other
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <div>
                          <button
                            type="button"
                            disabled={isUploadingDrawerDoc}
                            onClick={() => drawerDocInputRef.current?.click()}
                            className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {isUploadingDrawerDoc ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UploadCloud className="h-3 w-3 text-slate-500" />
                            )}
                            <span>Upload Document</span>
                          </button>
                          <input
                            ref={drawerDocInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0] && selectedCandidate) {
                                const file = e.target.files[0];
                                try {
                                  setIsUploadingDrawerDoc(true);
                                  const updated = await uploadDocumentMutation.mutateAsync({
                                    id: selectedCandidate.rawApp.id,
                                    file,
                                  });
                                  setSelectedCandidate((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          rawApp: updated,
                                        }
                                      : null,
                                  );
                                } catch (err) {
                                  console.error("Failed to upload document in drawer:", err);
                                } finally {
                                  setIsUploadingDrawerDoc(false);
                                  if (drawerDocInputRef.current) drawerDocInputRef.current.value = "";
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Document Content */}
                      {selectedCandidate.rawApp.resumeUrl ? (
                        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                {selectedCandidate.rawApp.resumeFileName ||
                                  "Resume.pdf"}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {selectedCandidate.rawApp.resumeFileSize
                                  ? formatFileSize(selectedCandidate.rawApp.resumeFileSize)
                                  : "Document"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={selectedCandidate.rawApp.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => drawerDocInputRef.current?.click()}
                              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              Replace
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => drawerDocInputRef.current?.click()}
                          className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 mb-0.5">
                            <FileText className="h-4 w-4" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            No documents yet.
                          </h4>
                          <p className="text-[10px] text-slate-400 max-w-xs">
                            Upload a resume, cover letter, or other document (PDF, DOC, DOCX — max 10 MB).
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply to Job Modal */}
      <ApplyToJobModal
        isOpen={!!applyToJobModalCandidate}
        onClose={() => setApplyToJobModalCandidate(null)}
        candidate={applyToJobModalCandidate}
        jobs={jobs}
        existingApplications={applications}
      />

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

export default function CandidatesPage() {
  return (
    <AuthGuard>
      <CandidatesPageContent />
    </AuthGuard>
  );
}
