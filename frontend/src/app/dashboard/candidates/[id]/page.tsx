"use client";

import React, { useState } from "react";
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
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ApplyToJobModal } from "@/components/candidates/apply-to-job-modal";
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
  ExternalLink,
  UploadCloud,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatFileSize, parseCandidateNotes } from "@/lib/utils";

function CandidateDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const candidateIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const candidateId = Number(candidateIdStr);

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();

  const uploadDocumentMutation = useUploadDocumentMutation();
  const deleteAppMutation = useDeleteApplicationMutation();

  const [activeTab, setActiveTab] = useState<"applications" | "documents">(
    "applications",
  );
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [documentFilter, setDocumentFilter] = useState("Resume");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  const loading = jobsLoading || appsLoading;

  // Find candidate application by ID
  const primaryApp = applications.find(
    (a) => String(a.id) === candidateIdStr || a.id === candidateId,
  );

  // Find all applications belonging to this candidate email/name
  const candidateApps = primaryApp
    ? applications.filter(
        (a) =>
          a.jobId &&
          a.candidateEmail.toLowerCase() ===
            primaryApp.candidateEmail.toLowerCase(),
      )
    : [];

  const { gender, dob } = parseCandidateNotes(primaryApp?.notes);



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

  if (!primaryApp && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => {}}
          jobsCount={jobs.length}
          candidatesCount={applications.length}
        />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Candidate not found
          </h2>
          <p className="text-xs text-slate-500">
            The candidate you are looking for does not exist or has been removed.
          </p>
          <Button
            onClick={() => router.push("/dashboard/candidates")}
            variant="outline"
            className="text-xs"
          >
            Back to Candidates
          </Button>
        </main>
      </div>
    );
  }

  const candidateName = primaryApp?.candidateName || "—";
  const candidateEmail = primaryApp?.candidateEmail || "—";
  const candidatePhone = primaryApp?.candidatePhone || "";
  const candidateCreated = formatDate(primaryApp?.createdAt);
  const candidateUpdated = formatDate(primaryApp?.updatedAt || primaryApp?.createdAt);

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0] && primaryApp) {
      const file = e.target.files[0];
      try {
        setIsUploadingDoc(true);
        await uploadDocumentMutation.mutateAsync({ id: primaryApp.id, file });
      } catch (err) {
        console.error("Failed to upload document:", err);
      } finally {
        setIsUploadingDoc(false);
        if (docInputRef.current) docInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!primaryApp) return;
    if (!confirm(`Are you sure you want to delete candidate ${candidateName}?`))
      return;
    try {
      setIsDeleting(true);
      await deleteAppMutation.mutateAsync(primaryApp.id);
      router.push("/dashboard/candidates");
    } catch (err) {
      console.error("Failed to delete candidate:", err);
    } finally {
      setIsDeleting(false);
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
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-4xl w-full mx-auto space-y-5">
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
                  `/dashboard/candidates/${primaryApp?.candidateEmail ? encodeURIComponent(primaryApp.candidateEmail) : candidateIdStr}/edit`,
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
              onClick={handleDelete}
              className="h-8 px-3 rounded-lg border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
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
          {/* Header Row: Tabs & Apply to Job button */}
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
                Documents ({primaryApp?.resumeUrl ? 1 : 0})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setApplyModalOpen(true)}
              className="mb-2.5 h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Apply to Job</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "applications" && (
            <div>
              {candidateApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No applications yet
                  </h4>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {candidateApps.map((app) => {
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
          {activeTab === "documents" && (
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

              {/* Document Content */}
              {primaryApp?.resumeUrl ? (
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {primaryApp.resumeFileName || "Resume.pdf"}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {primaryApp.resumeFileSize ? (
                          <>
                            <span>{formatFileSize(primaryApp.resumeFileSize)}</span>
                            <span>•</span>
                          </>
                        ) : null}
                        <span>Uploaded {formatDate(primaryApp.createdAt, "short")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={primaryApp.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="h-8 px-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Replace</span>
                    </button>
                  </div>
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
