"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Building2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateApplicationMutation, useOpenJobs } from "@/hooks/use-queries";
import { useAuth } from "@/context/auth-context";
import { DetailModal } from "@/components/shared";
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
    email?: string | null;
    phone?: string;
    notes?: string;
    resumeUrl?: string | null;
    resumeFileName?: string | null;
    rawApp?: Application;
  } | null;
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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorMessage = errorSource ? getApiErrorMessage(errorSource, t) : null;
  const createApplicationMutation = useCreateApplicationMutation();

  useEffect(() => {
    if (!isOpen && closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Query only open/active jobs (status=PUBLISHED) from the backend API
  const { data: openJobs = [], isLoading: jobsLoading } = useOpenJobs(
    isOpen ? user?.organizationId : null,
  );

  // Set of job IDs candidate already applied to
  const candidateEmailLower = candidate?.email?.trim().toLowerCase() || "";
  const appliedJobIds = useMemo(
    () =>
      new Set(
        existingApplications
          .filter(
            (a) =>
              (candidate && a.candidateId === candidate.id) ||
              (candidateEmailLower &&
                a.candidateEmail &&
                a.candidateEmail.trim().toLowerCase() === candidateEmailLower),
          )
          .map((a) => a.jobId),
      ),
    [existingApplications, candidate, candidateEmailLower],
  );

  if (!candidate) return null;

  const isAnySubmitting = submittingJobId !== null;

  const handleClose = () => {
    if (isAnySubmitting) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setErrorSource(null);
    setSuccessJobId(null);
    onClose();
  };

  const handleApply = async (job: Job) => {
    if (isAnySubmitting) return;
    try {
      setErrorSource(null);
      setSubmittingJobId(job.id);
      const formData = new FormData();
      formData.append("jobId", String(job.id));
      formData.append("candidateId", candidate.id);
      if (candidate.email) {
        formData.append("candidateEmail", candidate.email);
      }
      if (candidate.phone) {
        formData.append("candidatePhone", candidate.phone);
      }

      const effectiveResumeUrl =
        candidate.resumeUrl || candidate.rawApp?.resumeUrl;
      const effectiveResumeFileName =
        candidate.resumeFileName || candidate.rawApp?.resumeFileName;

      if (effectiveResumeUrl) {
        formData.append("resumeUrl", effectiveResumeUrl);
        if (effectiveResumeFileName) {
          formData.append("resumeFileName", effectiveResumeFileName);
        }
      }

      await createApplicationMutation.mutateAsync(formData);
      setSuccessJobId(job.id);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = setTimeout(() => {
        setSuccessJobId(null);
        setErrorSource(null);
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
    <DetailModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("applications.applyToJobTitle")}
      size="md"
      disableClose={isAnySubmitting}
      footer={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isAnySubmitting}
          onClick={handleClose}
          className="h-8 px-4 text-xs cursor-pointer"
        >
          {t("common.close")}
        </Button>
      }
      bodyClassName="p-5 bg-background text-foreground space-y-3"
    >
      {errorMessage && (
        <div
          role="alert"
          className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/30"
        >
          {errorMessage}
        </div>
      )}

      {/* Job List */}
      <div className="space-y-2.5">
        {jobsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2
              className="h-6 w-6 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        ) : openJobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            {t("applications.noActiveJobs")}
          </div>
        ) : (
          openJobs.map((job) => {
            const isApplied = appliedJobIds.has(job.id);
            const isSubmittingThis = submittingJobId === job.id;
            const isSuccess = successJobId === job.id;

            const jobTypeLabel = getJobTypeLabel(job.type, t);
            const jobTitle = `${job.title} (${jobTypeLabel})`;

            return (
              <div
                key={job.id}
                className="p-3.5 sm:p-4 rounded-xl border border-border bg-card text-card-foreground hover:border-ring/50 flex items-center justify-between gap-3 transition-all shadow-2xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0">
                      <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {jobTitle}
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate pl-8">
                    {job.location ||
                      job.department ||
                      t("jobs.defaultLocation")}
                  </p>
                </div>

                <div className="shrink-0">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("applications.appliedBadge")}
                    </span>
                  ) : isApplied ? (
                    <span className="text-xs font-medium text-muted-foreground px-2.5 py-1">
                      {t("applications.appliedBadge")}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isAnySubmitting}
                      onClick={() => handleApply(job)}
                      className="h-8 px-3 text-xs font-semibold gap-1 cursor-pointer shadow-2xs"
                    >
                      {isSubmittingThis && (
                        <Loader2
                          className="h-3 w-3 animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      <span>{t("applications.applyButton")}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </DetailModal>
  );
}
