"use client";

import { useState, useMemo } from "react";
import { Building2, Check, Loader2 } from "lucide-react";
import { useCreateApplicationMutation, useOpenJobs } from "@/hooks/use-queries";
import { useAuth } from "@/context/auth-context";
import { MacOsModal } from "@/components/shared";
import { useI18n } from "@/i18n";
import { getApiErrorMessage, type AppErrorSource } from "@/lib/api-error";
import { getJobTypeLabel } from "@/lib/jobs";
import type { Job, Application } from "@/types";

interface ApplyToJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    notes?: string;
    resumeUrl?: string | null;
    resumeFileName?: string | null;
    rawApp?: Application;
  } | null;
  jobs?: Job[];
  existingApplications: Application[];
}

export function ApplyToJobModal({
  isOpen,
  onClose,
  candidate,
  existingApplications,
}: ApplyToJobModalProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [submittingJobId, setSubmittingJobId] = useState<string | null>(null);
  const [successJobId, setSuccessJobId] = useState<string | null>(null);
  const [errorSource, setErrorSource] = useState<AppErrorSource | null>(null);
  const errorMessage = errorSource ? getApiErrorMessage(errorSource, t) : null;
  const createApplicationMutation = useCreateApplicationMutation();

  // Query only open/active jobs (status=PUBLISHED) from the backend API
  const { data: openJobs = [], isLoading: jobsLoading } = useOpenJobs(
    isOpen ? user?.organizationId : null,
  );

  // Set of job IDs candidate already applied to
  const appliedJobIds = useMemo(
    () =>
      new Set(
        existingApplications
          .filter(
            (a) =>
              (candidate && a.candidateId === candidate.id) ||
              (candidate &&
                a.candidateEmail &&
                a.candidateEmail.toLowerCase() === candidate.email.toLowerCase()),
          )
          .map((a) => a.jobId),
      ),
    [existingApplications, candidate],
  );

  if (!isOpen || !candidate) return null;

  const handleApply = async (job: Job) => {
    try {
      setErrorSource(null);
      setSubmittingJobId(job.id);
      const formData = new FormData();
      formData.append("jobId", String(job.id));
      formData.append("candidateId", candidate.id);
      formData.append("candidateName", candidate.name);
      formData.append("candidateEmail", candidate.email);
      if (candidate.phone) {
        formData.append("candidatePhone", candidate.phone);
      }
      if (candidate.notes) {
        formData.append("notes", candidate.notes);
      }

      const effectiveResumeUrl = candidate.resumeUrl || candidate.rawApp?.resumeUrl;
      const effectiveResumeFileName = candidate.resumeFileName || candidate.rawApp?.resumeFileName;

      if (effectiveResumeUrl) {
        formData.append("resumeUrl", effectiveResumeUrl);
        if (effectiveResumeFileName) {
          formData.append("resumeFileName", effectiveResumeFileName);
        }
      }

      await createApplicationMutation.mutateAsync(formData);
      setSuccessJobId(job.id);
      setTimeout(() => {
        setSuccessJobId(null);
        onClose();
      }, 600);
    } catch (err: unknown) {
      console.error("Failed to apply candidate to job:", err);
      setErrorSource(err);
    } finally {
      setSubmittingJobId(null);
    }
  };

  return (
    <MacOsModal
      isOpen={isOpen}
      onClose={() => {
        setErrorSource(null);
        onClose();
      }}
      title={t("applications.applyToJobTitle")}
      size="md"
      contentClassName="p-5 flex flex-col min-h-0 bg-[#fbfbfd] dark:bg-[#1a1a1a] space-y-3"
    >
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900/50">
          {errorMessage}
        </div>
      )}

      {/* Job List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {jobsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : openJobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 italic">
            {t("applications.noActiveJobs")}
          </div>
        ) : (
          openJobs.map((job) => {
            const isApplied = appliedJobIds.has(job.id);
            const isSubmitting = submittingJobId === job.id;
            const isSuccess = successJobId === job.id;

            const jobTypeLabel = getJobTypeLabel(job.type, t);
            const jobTitle = `${job.title} (${jobTypeLabel})`;

            return (
              <div
                key={job.id}
                className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#252525] hover:border-blue-300 dark:hover:border-blue-600 flex items-center justify-between gap-3 transition-all shadow-2xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {jobTitle}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-8">
                    {job.location || job.department || "Remote"}
                  </p>
                </div>

                <div className="shrink-0">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1">
                      <Check className="h-3.5 w-3.5" />
                      {t("applications.appliedBadge")}
                    </span>
                  ) : isApplied ? (
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2.5 py-1">
                      {t("applications.appliedBadge")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleApply(job)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      <span>{t("applications.applyButton")}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </MacOsModal>
  );
}
