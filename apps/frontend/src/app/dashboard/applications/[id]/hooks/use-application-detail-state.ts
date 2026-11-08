import { useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useApplication, useAllJobs } from "@/hooks/use-queries";
import {
  DEFAULT_OVERVIEW_SECTIONS,
  type OverviewSectionsState,
} from "@/components/applications/overview-sections-popover";
import {
  isValidUuid,
  getCandidateDisplayName,
  parseCandidateDocuments,
  formatDate,
  getInitials,
} from "@/lib/utils";
import { getJobTypeLabel } from "@/lib/jobs";
import { useI18n } from "@/i18n";
import type { CandidateDocument } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

export function useApplicationDetailState() {
  const params = useParams();
  const { user, canEdit } = useAuth();
  const { t } = useI18n();

  const appIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isAppIdValid = isValidUuid(appIdStr);

  const { data: app, isLoading: appLoading } = useApplication(
    isAppIdValid ? appIdStr : null,
  );
  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  const loading = appLoading || jobsLoading;

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);

  const [overviewSections, setOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isOverviewPopoverOpen, setIsOverviewPopoverOpen] = useState(false);
  const overviewBtnRef = useRef<HTMLButtonElement>(null);

  const job = useMemo(
    () => jobs.find((j) => j.id === app?.jobId),
    [jobs, app?.jobId],
  );

  const candidateDocuments = useMemo(() => {
    if (!app) return [];
    return parseCandidateDocuments(app.notes, {
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
  const jobTitle = job
    ? `${job.title} (${getJobTypeLabel(job.type, t)})`
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
    overviewSections,
    setOverviewSections,
    isOverviewPopoverOpen,
    setIsOverviewPopoverOpen,
    overviewBtnRef,
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
