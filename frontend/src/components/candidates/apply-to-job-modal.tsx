"use client";

import React, { useState } from "react";
import { X, Building2, Check, Loader2 } from "lucide-react";
import { useCreateApplicationMutation } from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
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
    rawApp?: Application;
  } | null;
  jobs: Job[];
  existingApplications: Application[];
}

export function ApplyToJobModal({
  isOpen,
  onClose,
  candidate,
  jobs,
  existingApplications,
}: ApplyToJobModalProps) {
  const { t } = useI18n();
  const [submittingJobId, setSubmittingJobId] = useState<string | null>(null);
  const [successJobId, setSuccessJobId] = useState<string | null>(null);
  const createApplicationMutation = useCreateApplicationMutation();

  if (!isOpen || !candidate) return null;

  // Set of job IDs candidate already applied to
  const appliedJobIds = new Set(
    existingApplications
      .filter(
        (a) =>
          a.jobId &&
          a.candidateEmail.toLowerCase() === candidate.email.toLowerCase(),
      )
      .map((a) => a.jobId),
  );

  const handleApply = async (job: Job) => {
    try {
      setSubmittingJobId(job.id);
      const formData = new FormData();
      formData.append("jobId", String(job.id));
      formData.append("candidateName", candidate.name);
      formData.append("candidateEmail", candidate.email);
      if (candidate.phone) {
        formData.append("candidatePhone", candidate.phone);
      }
      if (candidate.notes) {
        formData.append("notes", candidate.notes);
      }

      // If existing resumeUrl exists in candidate profile, pass resume info
      if (candidate.rawApp?.resumeUrl) {
        // We can pass existing resume information
        formData.append("resumeUrl", candidate.rawApp.resumeUrl);
        if (candidate.rawApp.resumeFileName) {
          formData.append("resumeFileName", candidate.rawApp.resumeFileName);
        }
      }

      await createApplicationMutation.mutateAsync(formData);
      setSuccessJobId(job.id);
      setTimeout(() => {
        setSuccessJobId(null);
        onClose();
      }, 600);
    } catch (err) {
      console.error("Failed to apply candidate to job:", err);
    } finally {
      setSubmittingJobId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card matching Screenshot */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <span>{t("applications.applyToJobTitle")}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Job List */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {jobs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              {t("applications.noActiveJobs")}
            </div>
          ) : (
            jobs.map((job) => {
              const isApplied = appliedJobIds.has(job.id);
              const isSubmitting = submittingJobId === job.id;
              const isSuccess = successJobId === job.id;

              const jobTypeLabel =
                job.type === "FULL_TIME"
                  ? t("jobs.fullTime")
                  : job.type === "PART_TIME"
                    ? t("jobs.partTime")
                    : job.type === "CONTRACT"
                      ? t("jobs.contract")
                      : job.type === "INTERNSHIP"
                        ? t("jobs.internship")
                        : job.type;

              const jobTitle = `${job.title} (${jobTypeLabel})`;

              return (
                <div
                  key={job.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {jobTitle}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {job.location || job.department || "Remote"}
                    </p>
                  </div>

                  <div>
                    {isSuccess ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        {t("applications.appliedBadge")}
                      </span>
                    ) : isApplied ? (
                      <span className="text-xs font-semibold text-slate-400 px-2 py-1">
                        {t("applications.appliedBadge")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleApply(job)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
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
      </div>
    </div>
  );
}
