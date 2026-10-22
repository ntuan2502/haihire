"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { canTransition, getTransitionDisabledReason } from "@/lib/stages";
import { downloadAuthenticatedFile } from "@/lib/api";
import {
  useUpdateStageMutation,
  useUpdateCandidateMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import {
  parseCandidateNotes,
  parseCandidateDocuments,
  fixUtf8String,
} from "@/lib/utils";
import {
  getInterviewsFromApplication,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import {
  DEFAULT_OVERVIEW_SECTIONS,
  type OverviewSectionsState,
} from "@/components/applications/overview-sections-popover";
import type {
  Job,
  Application,
  ApplicationStage,
  CandidateDocument,
} from "@/types";

interface UseCandidateDrawerProps {
  initialApplications: Application[];
  selectedApp: Application | null;
  setSelectedApp: Dispatch<SetStateAction<Application | null>>;
  jobMap: Map<string, Job>;
}

export function useCandidateDrawer({
  initialApplications,
  selectedApp,
  setSelectedApp,
  jobMap,
}: UseCandidateDrawerProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const updateStageMutation = useUpdateStageMutation();
  const updateCandidateMutation = useUpdateCandidateMutation();
  const deleteInterviewMutation = useDeleteInterviewMutation();

  const [drawerTab, setDrawerTab] = useState<string>("overview");
  const [drawerNoteInput, setDrawerNoteInput] = useState("");
  const [drawerNotesList, setDrawerNotesList] = useState<string[]>([]);

  // Drawer Overview sections visibility state
  const [drawerOverviewSections, setDrawerOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isDrawerOverviewPopoverOpen, setIsDrawerOverviewPopoverOpen] =
    useState(false);
  const drawerOverviewBtnRef = useRef<HTMLButtonElement>(null);
  const [drawerPreviewDoc, setDrawerPreviewDoc] =
    useState<CandidateDocument | null>(null);

  // Current selected application with fresh state from latest applications
  const currentApp = useMemo(() => {
    if (!selectedApp) return null;
    return (
      initialApplications.find((a) => a.id === selectedApp.id) || selectedApp
    );
  }, [selectedApp, initialApplications]);

  const allScheduledInterviews = useMemo(() => {
    return getInterviewsFromApplication(currentApp);
  }, [currentApp]);

  useEffect(() => {
    if (currentApp?.notes) {
      const { customNotes } = parseCandidateNotes(
        currentApp.notes,
        currentApp.candidateName,
      );
      const noteText = customNotes || currentApp.notes;
      const items = noteText.split(/\s*\|\s*|\n+/).filter(Boolean);
      setDrawerNotesList(items);
    } else {
      setDrawerNotesList([]);
    }
  }, [currentApp?.notes, currentApp?.candidateName]);

  const handleAddDrawerNote = async () => {
    if (!drawerNoteInput.trim() || !currentApp) return;
    const trimmed = drawerNoteInput.trim();
    const updated = [trimmed, ...drawerNotesList];
    setDrawerNotesList(updated);
    setDrawerNoteInput("");
    try {
      await updateCandidateMutation.mutateAsync({
        id: currentApp.id,
        data: {
          notes: updated.join(" | "),
        },
      });
      setSelectedApp((prev) =>
        prev ? { ...prev, notes: updated.join(" | ") } : null,
      );
    } catch (err) {
      console.error("Failed to save drawer application note:", err);
    }
  };

  const handleCancelInterview = async (
    interviewOrId?: ScheduledInterviewInfo | string,
  ) => {
    if (!currentApp) return;
    try {
      let targetId: string | undefined;
      if (typeof interviewOrId === "string") {
        targetId = interviewOrId;
      } else if (
        interviewOrId &&
        typeof interviewOrId === "object" &&
        "id" in interviewOrId &&
        typeof interviewOrId.id === "string"
      ) {
        targetId = interviewOrId.id;
      } else if (
        currentApp.interviews &&
        currentApp.interviews.length > 0 &&
        currentApp.interviews[0]?.id
      ) {
        targetId = currentApp.interviews[0].id;
      }

      if (targetId && typeof targetId === "string") {
        await deleteInterviewMutation.mutateAsync(targetId);
      }
    } catch (err) {
      console.error("Failed to cancel interview:", err);
    }
  };

  const handleStageChange = async (newStage: ApplicationStage) => {
    if (!currentApp) return;
    if (!canTransition(currentApp.stage, newStage)) {
      const reason = getTransitionDisabledReason(currentApp.stage, newStage, t);
      toast.error(reason);
      return;
    }
    try {
      await updateStageMutation.mutateAsync({
        id: currentApp.id,
        stage: newStage,
      });
      setSelectedApp((prev) => (prev ? { ...prev, stage: newStage } : null));
    } catch (err) {
      console.error("Failed to update stage:", err);
      const errorMsg = getApiErrorMessage(err, t);
      toast.error(errorMsg);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
  };

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
    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    const activeAppId = targetAppId || selectedApp?.id;
    if (!activeAppId) {
      toast.error(t("errors.cannotDownloadDocument"));
      return;
    }
    const downloadPath = `/applications/${activeAppId}/documents/download${queryString}`;

    try {
      await downloadAuthenticatedFile(downloadPath, downloadFileName);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const drawerCandidateDocuments = useMemo(() => {
    if (!currentApp) return [];
    const seenUrls = new Set<string>();
    const allDocs: CandidateDocument[] = [];
    const relatedApps = initialApplications.filter(
      (a) => a.candidateEmail && a.candidateEmail === currentApp.candidateEmail,
    );
    const appsToScan = relatedApps.length > 0 ? relatedApps : [currentApp];

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
  }, [currentApp, initialApplications]);

  const selectedJob = currentApp?.jobId ? jobMap.get(currentApp.jobId) : null;
  const selectedJobTitle = selectedJob
    ? `${selectedJob.title} (${
        selectedJob.type === "FULL_TIME"
          ? t("jobs.fullTime")
          : selectedJob.type === "PART_TIME"
            ? t("jobs.partTime")
            : selectedJob.type
      })`
    : currentApp?.jobId
      ? `${t("jobs.jobTitle")} #${currentApp.jobId}`
      : t("candidates.role");

  return {
    currentApp,
    drawerTab,
    setDrawerTab,
    drawerNoteInput,
    setDrawerNoteInput,
    drawerNotesList,
    handleAddDrawerNote,
    handleCancelInterview,
    handleStageChange,
    handleDownloadDoc,
    drawerOverviewSections,
    setDrawerOverviewSections,
    isDrawerOverviewPopoverOpen,
    setIsDrawerOverviewPopoverOpen,
    drawerOverviewBtnRef,
    drawerPreviewDoc,
    setDrawerPreviewDoc,
    allScheduledInterviews,
    drawerCandidateDocuments,
    selectedJobTitle,
    isStageUpdatePending: updateStageMutation.isPending,
  };
}
