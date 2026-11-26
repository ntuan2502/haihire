import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useApplication,
  useApplicationNotes,
  useJob,
} from "@/hooks/use-queries";
import {
  isValidUuid,
  getCandidateDisplayName,
  parseCandidateDocuments,
  formatDate,
  getInitials,
} from "@/lib/utils";
import { getJobTypeLabel } from "@/lib/jobs";
import { APPLICATION_DETAIL_TABS } from "@/components/applications/detail/application-detail-tabs";
import { useLocalization } from "@/components/providers";
import { useI18n } from "@/i18n";
import type { CandidateDocument, Job } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

function parseDetailTabParam(value: string | null): string {
  return value && (APPLICATION_DETAIL_TABS as readonly string[]).includes(value)
    ? value
    : "overview";
}

export function useApplicationDetailState() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { canEdit: authCanEdit } = useAuth();
  const hasCreateInterview = useHasPermission("interview:create");
  const hasUpdateInterview = useHasPermission("interview:update");
  const hasDeleteInterview = useHasPermission("interview:delete");
  const canEdit =
    authCanEdit ||
    hasCreateInterview ||
    hasUpdateInterview ||
    hasDeleteInterview;
  const { t, locale } = useI18n();
  const { localization, isConfigured } = useLocalization();

  const appIdStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isAppIdValid = isValidUuid(appIdStr);

  const { data: app, isLoading: appLoading } = useApplication(
    isAppIdValid ? appIdStr : null,
  );
  const { data: fetchedJob, isLoading: jobLoading } = useJob(
    app?.job ? null : (app?.jobId ?? null),
  );
  const { data: applicationNotes = [] } = useApplicationNotes(
    isAppIdValid ? appIdStr : null,
  );

  const job = (app?.job ?? fetchedJob) as Job | undefined;
  const jobs = useMemo(() => (job ? [job as unknown as Job] : []), [job]);

  const loading =
    appLoading || (!app?.job && Boolean(app?.jobId) && jobLoading);

  const [activeTab, setActiveTabState] = useState<string>(() =>
    parseDetailTabParam(searchParams.get("tab")),
  );
  const lastSyncedSearchRef = useRef<string>(searchParamsString);
  const selfWrittenSearchesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (lastSyncedSearchRef.current === searchParamsString) {
      selfWrittenSearchesRef.current.clear();
      return;
    }
    if (selfWrittenSearchesRef.current.has(searchParamsString)) {
      selfWrittenSearchesRef.current.delete(searchParamsString);
      return;
    }
    lastSyncedSearchRef.current = searchParamsString;
    const snapshot = new URLSearchParams(searchParamsString);
    setActiveTabState(parseDetailTabParam(snapshot.get("tab")));
  }, [searchParamsString]);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const snapshot = new URLSearchParams(window.location.search);
      lastSyncedSearchRef.current = snapshot.toString();
      setActiveTabState(parseDetailTabParam(snapshot.get("tab")));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setActiveTab = useCallback(
    (tab: string) => {
      const normalized = parseDetailTabParam(tab);
      setActiveTabState(normalized);
      if (typeof window === "undefined") return;
      const nextParams = new URLSearchParams(window.location.search);
      if (normalized === "overview") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", normalized);
      }
      const queryString = nextParams.toString();
      lastSyncedSearchRef.current = queryString;
      const basePath = pathname || `/applications/${appIdStr || ""}`;
      const nextUrl = queryString ? `${basePath}?${queryString}` : basePath;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl === currentUrl) return;
      selfWrittenSearchesRef.current.add(queryString);
      window.history.replaceState(null, "", nextUrl);
    },
    [pathname, appIdStr],
  );

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
    }).map((doc) => ({ ...doc, sourceApplicationId: app.id }));
  }, [app]);

  const locOverrides = isConfigured
    ? { ...localization, defaultLanguage: locale }
    : { defaultLanguage: locale };
  const candidateName = getCandidateDisplayName(app, localization);
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
  const appliedDate = formatDate(app?.createdAt, "numeric", locOverrides);
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
    notesCount: applicationNotes.length,
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
