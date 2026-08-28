"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import {
  useJobs,
  useAllApplications,
  useUploadDocumentMutation,
  useDeleteApplicationMutation,
  useDeleteDocumentMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ApplyToJobModal } from "@/components/candidates/apply-to-job-modal";
import { DeleteCandidateModal } from "@/components/candidates/delete-candidate-modal";
import { DeleteDocumentModal } from "@/components/candidates/delete-document-modal";
import {
  ArrowLeft,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Plus,
  Briefcase,
  FileText,
  UploadCloud,
  Loader2,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  parseCandidateNotes,
  parseCandidateDocuments,
  fixUtf8String,
  isValidUuid,
} from "@/lib/utils";
import type { CandidateDocument } from "@/types";
import { StageBadge } from "@/components/ui/stage-badge";

function CandidateDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const candidateIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();

  const uploadDocumentMutation = useUploadDocumentMutation();
  const deleteAppMutation = useDeleteApplicationMutation();
  const deleteDocMutation = useDeleteDocumentMutation();

  const [activeTab, setActiveTab] = useState<"applications" | "documents">(
    "applications",
  );
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [documentFilter, setDocumentFilter] = useState("Resume");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<CandidateDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  const loading = jobsLoading || appsLoading;

  // Strict UUID validation — candidate URL MUST be a valid UUID
  const isCandidateIdValid = isValidUuid(candidateIdStr);
  const primaryApp = isCandidateIdValid
    ? applications.find((a) => String(a.id) === String(candidateIdStr))
    : undefined;

  // Find all applications belonging to this candidate email/name
  const candidateApps = useMemo(() => {
    if (!primaryApp) return [];
    return applications.filter(
      (a) =>
        a.jobId &&
        a.candidateEmail.toLowerCase() ===
          primaryApp.candidateEmail.toLowerCase(),
    );
  }, [primaryApp, applications]);

  const filteredCandidateApps = useMemo(() => {
    if (stageFilter === "ALL") return candidateApps;
    return candidateApps.filter((a) => a.stage === stageFilter);
  }, [candidateApps, stageFilter]);

  const candidateDocuments = useMemo(() => {
    if (!primaryApp) return [];
    const allDocs: CandidateDocument[] = [];
    const seenUrls = new Set<string>();

    for (const app of candidateApps.concat(primaryApp)) {
      const appDocs = parseCandidateDocuments(app.notes, {
        id: app.id,
        resumeUrl: app.resumeUrl,
        resumeFileName: app.resumeFileName,
        resumeFileSize: app.resumeFileSize,
        resumeMimeType: app.resumeMimeType,
        createdAt: app.createdAt,
      });

      for (const d of appDocs) {
        if (d.url && !seenUrls.has(d.url)) {
          seenUrls.add(d.url);
          allDocs.push(d);
        }
      }
    }
    return allDocs;
  }, [candidateApps, primaryApp]);

  const filteredDocuments = useMemo(() => {
    if (!documentFilter || documentFilter === "All") return candidateDocuments;
    return candidateDocuments.filter(
      (d) =>
        (d.type || "Resume").toLowerCase() === documentFilter.toLowerCase(),
    );
  }, [candidateDocuments, documentFilter]);

  const parsedNotes = parseCandidateNotes(primaryApp?.notes, primaryApp?.candidateName);
  const gender = parsedNotes.gender;
  const dob = parsedNotes.dob;
  const candidateName = parsedNotes.effectiveName;
  const candidateEmail = primaryApp?.candidateEmail || "—";
  const candidatePhone = primaryApp?.candidatePhone || "";
  const candidateCreated = formatDate(primaryApp?.createdAt);
  const candidateUpdated = formatDate(primaryApp?.updatedAt || primaryApp?.createdAt);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
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

  if ((!isCandidateIdValid || !primaryApp) && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
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
            Candidate Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {!isCandidateIdValid
              ? "The candidate ID provided is invalid. A valid UUID is required."
              : "The candidate you are looking for does not exist or has been removed."}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard/candidates")}
              variant="outline"
              className="text-xs font-semibold rounded-xl"
            >
              Back to Candidates
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0] && primaryApp) {
      const file = e.target.files[0];
      try {
        setIsUploadingDoc(true);
        await uploadDocumentMutation.mutateAsync({
          id: primaryApp.id,
          file,
          type: documentFilter,
        });
      } catch (err) {
        console.error("Failed to upload document:", err);
      } finally {
        setIsUploadingDoc(false);
        if (docInputRef.current) docInputRef.current.value = "";
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!primaryApp) return;
    try {
      setIsDeleting(true);
      await deleteAppMutation.mutateAsync(primaryApp.id);
      setIsDeleteModalOpen(false);
      router.push("/dashboard/candidates");
    } catch (err) {
      console.error("Failed to delete candidate:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDocumentUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return `${apiUrl.replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleDownloadDoc = async (
    url: string,
    filename?: string,
    appId?: string,
  ) => {
    const rawFileName = filename || "document.pdf";
    const downloadFileName = fixUtf8String(rawFileName);
    const queryParams = new URLSearchParams();
    if (url) queryParams.set("url", url);
    if (downloadFileName) queryParams.set("name", downloadFileName);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    try {
      const targetUrl = appId
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/applications/${appId}/documents/download${queryString}`
        : getDocumentUrl(url);

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
      const fallbackUrl = appId
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/applications/${appId}/documents/download${queryString}`
        : getDocumentUrl(url);
      const a = document.createElement("a");
      a.href = fallbackUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!primaryApp || !docToDelete) return;
    try {
      setIsDeletingDoc(true);
      await deleteDocMutation.mutateAsync({
        id: primaryApp.id,
        documentId: docToDelete.id,
        url: docToDelete.url,
      });
      if (
        previewDoc?.id === docToDelete.id ||
        previewDoc?.url === docToDelete.url
      ) {
        setPreviewDoc(null);
      }
      setDocToDelete(null);
    } catch (err) {
      console.error("Failed to delete document:", err);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        activeTab="candidates"
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
            href="/dashboard/candidates"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Candidates</span>
          </Link>
        </div>

        {/* Candidate Header matching Screenshot 2 */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {candidateName}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <a
                href={`mailto:${candidateEmail}`}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{candidateEmail}</span>
              </a>
              {candidatePhone && (
                <a
                  href={`tel:${candidatePhone}`}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{candidatePhone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/candidates/${primaryApp?.id || candidateIdStr}/edit`,
                )
              }
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Edit2 className="h-3 w-3 text-slate-400" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-8 px-3 rounded-lg border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Card 1: Details */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
            {/* First Name */}
            <div>
              <span className="text-slate-400 text-[11px] block">First Name</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {parsedNotes.firstName || "—"}
              </span>
            </div>

            {/* Last Name */}
            <div>
              <span className="text-slate-400 text-[11px] block">Last Name</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {parsedNotes.lastName || "—"}
              </span>
            </div>

            {/* Display Name */}
            <div>
              <span className="text-slate-400 text-[11px] block">Display Name</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {parsedNotes.displayName || candidateName || "—"}
              </span>
            </div>

            {/* Email */}
            <div>
              <span className="text-slate-400 text-[11px] block">Email</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {candidateEmail}
              </span>
            </div>

            {/* Phone */}
            <div>
              <span className="text-slate-400 text-[11px] block">Phone</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {candidatePhone || "—"}
              </span>
            </div>

            {/* Gender */}
            <div>
              <span className="text-slate-400 text-[11px] block">Gender</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {gender}
              </span>
            </div>

            {/* Date of Birth */}
            <div>
              <span className="text-slate-400 text-[11px] block">Date of Birth</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {dob}
              </span>
            </div>

            {/* Created */}
            <div>
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created
              </span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {candidateCreated}
              </span>
            </div>

            {/* Updated */}
            <div>
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated
              </span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                {candidateUpdated}
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

        {/* Card 3: Tabs (Applications / Documents) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          {/* Header Row: Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-6 text-xs font-bold -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "applications"
                    ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                }`}
              >
                Applications ({candidateApps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "documents"
                    ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                }`}
              >
                Documents ({candidateDocuments.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "applications" && (
            <div className="space-y-4">
              {/* Applications Action Row */}
              <div className="flex items-center justify-between gap-3">
                <Select
                  value={stageFilter}
                  onValueChange={(v) => v && setStageFilter(v)}
                >
                  <SelectTrigger className="h-8 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">
                      All stages
                    </SelectItem>
                    <SelectItem value="APPLIED" className="text-xs">
                      Applied
                    </SelectItem>
                    <SelectItem value="SCREENING" className="text-xs">
                      Screening
                    </SelectItem>
                    <SelectItem value="INTERVIEW" className="text-xs">
                      Interview
                    </SelectItem>
                    <SelectItem value="OFFER" className="text-xs">
                      Offer
                    </SelectItem>
                    <SelectItem value="HIRED" className="text-xs">
                      Hired
                    </SelectItem>
                    <SelectItem value="REJECTED" className="text-xs">
                      Rejected
                    </SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => setApplyModalOpen(true)}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Apply to Job</span>
                </button>
              </div>

              {filteredCandidateApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {candidateApps.length === 0
                      ? "No applications yet"
                      : "No applications matching this stage"}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    {candidateApps.length === 0
                      ? "This candidate has not been applied to any jobs yet."
                      : "Try switching to another stage filter."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCandidateApps.map((app) => {
                    const job = jobs.find((j) => j.id === app.jobId);
                    return (
                      <div
                        key={app.id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-900 dark:text-white">
                            {job?.title || "Position"}
                          </h4>
                          <p className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>Stage: {app.stage}</span>
                            <span>•</span>
                            <span>Applied {formatDate(app.createdAt)}</span>
                          </p>
                        </div>
                        <StageBadge stage={app.stage} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab matching Screenshot 1, 2, 3 */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              {previewDoc ? (
                /* Preview Mode matching Screenshot 2 */
                <div className="space-y-4">
                  {/* Back button & Download */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(null)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to documents</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadDoc(
                          previewDoc.url,
                          previewDoc.name,
                          primaryApp?.id,
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Document Title */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span>{previewDoc.name}</span>
                  </div>

                  {/* Embedded Document Viewer matching Screenshot 2 */}
                  <div className="w-full h-[650px] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner">
                    <iframe
                      src={getDocumentUrl(previewDoc.url)}
                      className="w-full h-full border-0"
                      title={previewDoc.name}
                    />
                  </div>
                </div>
              ) : (
                /* Normal Documents View */
                <div className="space-y-4">
                  {/* Document Toolbar: Filter + Upload Button */}
                  <div className="flex items-center justify-between gap-3">
                    <Select
                      value={documentFilter}
                      onValueChange={(v) => v && setDocumentFilter(v)}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                        <SelectValue placeholder="Resume" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All" className="text-xs">
                          All
                        </SelectItem>
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
                        disabled={isUploadingDoc}
                        onClick={() => docInputRef.current?.click()}
                        className="h-8 px-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {isUploadingDoc ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span>Upload Document</span>
                      </button>
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={handleDocumentUpload}
                      />
                    </div>
                  </div>

                  {/* Document Cards List */}
                  {filteredDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {filteredDocuments.map((doc) => (
                        <div
                          key={doc.id || doc.url}
                          className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Red Document Icon matching Screenshot 1 */}
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {doc.name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                                <span>{doc.type || "Resume"}</span>
                                <span>•</span>
                                <span>{formatDate(doc.createdAt, "short")}</span>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline cursor-pointer"
                                >
                                  Click to preview
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 3 action buttons matching Screenshot 1: View, Download, Delete */}
                          <div className="flex items-center gap-1 shrink-0 text-slate-400">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="View preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadDoc(
                                  doc.url,
                                  doc.name,
                                  primaryApp?.id,
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Download document"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDocToDelete(doc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty state matching Screenshot 2 */
                    <div
                      onClick={() => docInputRef.current?.click()}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-10 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        No documents yet.
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Upload a resume, cover letter, or other document (PDF, DOC, DOCX — max 10 MB).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Apply to Job Modal */}
      <ApplyToJobModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        candidate={
          primaryApp
            ? {
                id: primaryApp.id,
                name: primaryApp.candidateName,
                email: primaryApp.candidateEmail,
                phone: primaryApp.candidatePhone || undefined,
                notes: primaryApp.notes || undefined,
                rawApp: primaryApp,
              }
            : null
        }
        jobs={jobs}
        existingApplications={applications}
      />

      {/* Delete Candidate Confirmation Modal matching screenshot */}
      {primaryApp && (
        <DeleteCandidateModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          candidateName={candidateName}
          isDeleting={isDeleting}
        />
      )}

      {/* Delete Document Confirmation Modal matching Screenshot 3 */}
      <DeleteDocumentModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDeleteDoc}
        isLoading={isDeletingDoc}
      />
    </div>
  );
}

export default function CandidateDetailPage() {
  return (
    <AuthGuard>
      <CandidateDetailPageContent />
    </AuthGuard>
  );
}
