import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { canTransition, getTransitionDisabledReason } from "@/lib/stages";
import { downloadAuthenticatedFile } from "@/lib/api";
import { fixUtf8String } from "@/lib/utils";
import {
  useUpdateStageMutation,
  useDeleteApplicationMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import type { Application, ApplicationStage } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

interface UseApplicationStageActionsProps {
  app: Application | null | undefined;
  appIdStr?: string;
  setIsDeleteModalOpen: (open: boolean) => void;
}

export function useApplicationStageActions({
  app,
  appIdStr,
  setIsDeleteModalOpen,
}: UseApplicationStageActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [isDeleting, setIsDeleting] = useState(false);

  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();
  const deleteInterviewMutation = useDeleteInterviewMutation();

  const handleStageChange = async (newStage: ApplicationStage) => {
    if (!app) return;
    if (!canTransition(app.stage, newStage)) {
      const reason = getTransitionDisabledReason(app.stage, newStage, t);
      toast.error(reason);
      return;
    }
    try {
      await updateStageMutation.mutateAsync({
        id: app.id,
        stage: newStage,
      });
    } catch (err) {
      console.error("Failed to update stage:", err);
      const errorMsg = getApiErrorMessage(err, t);
      toast.error(errorMsg);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["application", appIdStr] });
    }
  };

  const handleCancelInterview = async (
    interviewOrId?: ScheduledInterviewInfo | string,
  ) => {
    if (!app) return;
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
        app.interviews &&
        app.interviews.length > 0 &&
        app.interviews[0]?.id
      ) {
        targetId = app.interviews[0].id;
      }

      if (targetId && typeof targetId === "string") {
        await deleteInterviewMutation.mutateAsync(targetId);
      }
    } catch (err) {
      console.error("Failed to cancel interview:", err);
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleConfirmDelete = async () => {
    if (!app) return;
    try {
      setIsDeleting(true);
      await deleteAppMutation.mutateAsync(app.id);
      setIsDeleteModalOpen(false);
      router.push("/dashboard/applications");
    } catch (err) {
      console.error("Failed to delete application:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsDeleting(false);
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

    const activeAppId = targetAppId || app?.id;
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

  return {
    isDeleting,
    isUpdatingStage: updateStageMutation.isPending,
    handleStageChange,
    handleCancelInterview,
    handleConfirmDelete,
    handleDownloadDoc,
  };
}
