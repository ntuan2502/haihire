import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useApplication, useJob } from "@/hooks/use-queries";
import {
  isValidUuid,
  getCandidateDisplayName,
  parseCandidateDocuments,
  formatDate,
  getInitials,
} from "@/lib/utils";
import { getJobTypeLabel } from "@/lib/jobs";
import { useI18n } from "@/i18n";
import type { CandidateDocument, Job } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

export function useApplicationDetailState() {
  const params = useParams();
  const { canEdit: authCanEdit } = useAuth();
  const hasCreateInterview = useHasPermission("interview:create");
  const hasUpdateInterview = useHasPermission("interview:update");
  const hasDeleteInterview = useHasPermission("interview:delete");
  const canEdit =
    authCanEdit ||
    hasCreateInterview ||
    hasUpdateInterview ||
    hasDeleteInterview;
  const { t } = useI18n();

  const appIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isAppIdValid = isValidUuid(appIdStr);

  const { data: app, isLoading: appLoading } = useApplication(
    isAppIdValid ? appIdStr : null,
  );
  const { data: fetchedJob, isLoading: jobLoading } = useJob(
    app?.job ? null : (app?.jobId ?? null),
  );

  const job = (app?.job ?? fetchedJob) as Job | undefined;
  const jobs = useMemo(() => (job ? [job as unknown as Job] : []), [job]);

  const loading =
    appLoading || (!app?.job && Boolean(app?.jobId) && jobLoading);

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);

  const candidateDocuments = useMemo(() => {
    if (!app) return [];
    return parseCandidateDocuments({
      id: app.id,
      resumeUrl: app.resumeUrl,
      resumeFileName: app.resumeFileName,
      resumeFileSize: app.resumeFileSize,
      resumeMimeType: app.resumeMimeType,
      createdAt: app.createdAt,
    });
  }, [app]);

  const candidateName = getCandidateDisplayName(app);
  const candidateEmail = app?.candidateEmail || "—";
  const candidatePhone = app?.candidatePhone || "";
  const jobTypeLabel = job?.type ? getJobTypeLabel(job.type, t) : "";
  const jobTitle = job
    ? jobTypeLabel
      ? `${job.title} (${jobTypeLabel})`
      : job.title
    : app?.jobId
      ? `${t("jobs.jobTitle")} #${app.jobId}`
      : t("candidates.role");
  const appliedDate = formatDate(app?.createdAt);
  const initials = getInitials(candidateName);

  return {
    appIdStr,
    isAppIdValid,
    app,
    jobs,
    job,
    canEdit,
    loading,
    activeTab,
    setActiveTab,
    candidateDocuments,
    candidateName,
    candidateEmail,
    candidatePhone,
    jobTitle,
    appliedDate,
    initials,
    previewDoc,
    setPreviewDoc,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    scheduleModalOpen,
    setScheduleModalOpen,
    editingInterview,
    setEditingInterview,
    isSendEmailOpen,
    setIsSendEmailOpen,
  };
}
