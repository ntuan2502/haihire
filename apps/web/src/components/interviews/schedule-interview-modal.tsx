"use client";

import { useState, useMemo, useRef, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CustomModal, CustomSelect } from "@/components/shared";
import { useFlowTemplateSelection } from "@/components/email/flow-template-selector";
import { AlertCircle, Briefcase } from "lucide-react";
import { ScheduleInterviewTimingFields } from "./schedule/schedule-interview-timing-fields";
import { ScheduleInterviewInterviewerFields } from "./schedule/schedule-interview-interviewer-fields";
import {
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useOrgInterviewers,
} from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  extractDateTimeInTimezone,
  combineDateTimeInTimezone,
} from "@haihire/shared";
import { getCandidateDisplayName, resolveEffectiveTimezone } from "@/lib/utils";
import {
  type ScheduledInterviewInfo,
  normalizeInterviewType,
} from "@/lib/interviews";
import { getApiErrorMessage } from "@/lib/api-error";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import type {
  Application,
  Job,
  Interview,
  InterviewType,
  InterviewFormat,
} from "@/types";

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs?: Job[];
  applications?: Application[];
  selectedJobId?: string;
  selectedApplicationId?: string;
  initialDate?: string;
  editingInterview?: ScheduledInterviewInfo | Interview | null;
  onInterviewScheduled?: (interviewInfo: ScheduledInterviewInfo) => void;
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  jobs = [],
  applications = [],
  selectedJobId,
  selectedApplicationId,
  initialDate,
  editingInterview,
  onInterviewScheduled,
}: ScheduleInterviewModalProps) {
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );
  const queryClient = useQueryClient();
  const canManageInterviews = useHasPermission("interview:create");
  const { data: members = [] } = useOrgInterviewers({
    enabled: isOpen && canManageInterviews,
  });
  const createInterviewMutation = useCreateInterviewMutation();
  const updateInterviewMutation = useUpdateInterviewMutation();

  const [modalJobId, setModalJobId] = useState<string>("");
  const [modalCandidateId, setModalCandidateId] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState<string>("");
  const [interviewTime, setInterviewTime] = useState<string>("");
  const [interviewType, setInterviewType] = useState<InterviewType | "">("");
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat | "">(
    "",
  );
  const [linkOrLocation, setLinkOrLocation] = useState<string>("");
  const [interviewerId, setInterviewerId] = useState<string>("");
  const [interviewNotes, setInterviewNotes] = useState<string>("");
  const [sendEmailInvite, setSendEmailInvite] = useState<boolean>(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const hasTouchedEmailRef = useRef(false);
  const hasTouchedTemplateRef = useRef(false);
  const initializedSessionRef = useRef<string | null>(null);

  const {
    canViewEmail,
    activeTemplates,
    matchedFlow,
    defaultSendEnabled,
    defaultTemplateId,
  } = useFlowTemplateSelection(
    "INTERVIEW_SCHEDULED",
    isOpen && !editingInterview,
  );

  // Filter candidates for selected job
  const modalCandidates = useMemo(() => {
    if (!modalJobId) return applications;
    return applications.filter(
      (app) => String(app.jobId) === String(modalJobId),
    );
  }, [applications, modalJobId]);

  // Current selected candidate
  const currentCandidate = useMemo(() => {
    return applications.find((a) => a.id === modalCandidateId);
  }, [applications, modalCandidateId]);

  // Sync invitation email defaults from configured INTERVIEW_SCHEDULED flow
  useEffect(() => {
    if (!isOpen || editingInterview) {
      hasTouchedEmailRef.current = false;
      hasTouchedTemplateRef.current = false;
      setSendEmailInvite(true);
      setSelectedTemplateId("");
      return;
    }
    if (!canViewEmail && !hasTouchedEmailRef.current) {
      setSendEmailInvite(false);
    } else if (matchedFlow !== undefined && !hasTouchedEmailRef.current) {
      setSendEmailInvite(defaultSendEnabled);
    }
    if (!hasTouchedTemplateRef.current) {
      setSelectedTemplateId(defaultTemplateId);
    }
  }, [
    isOpen,
    editingInterview,
    canViewEmail,
    matchedFlow,
    defaultSendEnabled,
    defaultTemplateId,
  ]);

  // Sync state once per modal open session (ignore background SSE application refetches)
  useEffect(() => {
    if (!isOpen) {
      initializedSessionRef.current = null;
      return;
    }

    const sessionKey = `${selectedJobId ?? ""}:${selectedApplicationId ?? ""}:${editingInterview?.id ?? ""}:${initialDate ?? ""}`;

    // 1. Determine target candidate & job
    let candidateToUse: Application | undefined;
    if (selectedApplicationId) {
      candidateToUse = applications.find((a) => a.id === selectedApplicationId);
    } else if (editingInterview?.applicationId) {
      candidateToUse = applications.find(
        (a) => a.id === editingInterview.applicationId,
      );
    }

    if (initializedSessionRef.current === sessionKey) {
      if (candidateToUse?.jobId) {
        setModalJobId((prev) => prev || candidateToUse.jobId);
      }
      return;
    }
    initializedSessionRef.current = sessionKey;

    setFormError(null);

    if (editingInterview) {
      // Update schedule: populate form fields with existing interview data
      const initialJobId = selectedJobId || candidateToUse?.jobId || "";
      const { date, time } = extractDateTimeInTimezone(
        editingInterview.scheduledAt,
        effectiveTimezone,
      );
      setModalJobId(initialJobId);
      setModalCandidateId(
        editingInterview.applicationId || selectedApplicationId || "",
      );
      setInterviewDate(date);
      setInterviewTime(time);
      setInterviewType(normalizeInterviewType(editingInterview.type));
      setInterviewFormat(
        (editingInterview.format as InterviewFormat) || "MEET",
      );
      setLinkOrLocation(editingInterview.linkOrLocation || "");
      setInterviewerId(editingInterview.interviewerId || "");
      setInterviewNotes(editingInterview.notes || "");
    } else {
      // New schedule: initialize form fields empty / unpopulated
      const initialJobId = selectedJobId || candidateToUse?.jobId || "";
      setModalJobId(initialJobId);
      setModalCandidateId(selectedApplicationId || "");
      setInterviewDate(initialDate || "");
      setInterviewTime("");
      setInterviewType("");
      setInterviewFormat("");
      setLinkOrLocation("");
      setInterviewerId("");
      setInterviewNotes("");
    }
  }, [
    isOpen,
    selectedJobId,
    selectedApplicationId,
    initialDate,
    editingInterview,
    applications,
    effectiveTimezone,
  ]);

  // When candidate changes manually, keep other fields empty
  const handleCandidateChange = (candId: string) => {
    setModalCandidateId(candId);
  };

  const handleSaveInterview = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!modalCandidateId) {
      setFormError(t("interviews.errors.selectCandidate"));
      return;
    }
    if (!interviewDate) {
      setFormError(t("interviews.errors.selectDate"));
      return;
    }
    if (!interviewTime) {
      setFormError(t("interviews.errors.selectTime"));
      return;
    }
    if (!interviewType) {
      setFormError(t("interviews.errors.selectType"));
      return;
    }
    if (!interviewFormat) {
      setFormError(t("interviews.errors.selectFormat"));
      return;
    }
    const interviewer = members.find((member) => member.id === interviewerId);
    if (!interviewer) {
      setFormError(t("interviews.errors.enterInterviewer"));
      return;
    }

    const candidate = applications.find((a) => a.id === modalCandidateId);
    if (!candidate) {
      setFormError(t("interviews.errors.candidateNotFound"));
      return;
    }

    try {
      const scheduledAt = combineDateTimeInTimezone(
        interviewDate,
        interviewTime,
        effectiveTimezone,
      );

      const interviewInfo: ScheduledInterviewInfo = {
        id: editingInterview?.id,
        applicationId: candidate.id,
        scheduledAt,
        type: interviewType as InterviewType,
        format: interviewFormat as InterviewFormat,
        linkOrLocation: linkOrLocation.trim(),
        interviewer: interviewer.name,
        interviewerId,
        notes: interviewNotes.trim(),
      };

      if (editingInterview?.id) {
        // Update existing interview schedule
        await updateInterviewMutation.mutateAsync({
          id: editingInterview.id,
          data: {
            scheduledAt,
            type: interviewType as InterviewType,
            format: (interviewFormat as InterviewFormat) || "MEET",
            linkOrLocation: linkOrLocation.trim(),
            interviewerId,
            notes: interviewNotes.trim() || undefined,
          },
        });
      } else {
        // Create new interview schedule (backend advances stage atomically in transaction)
        await createInterviewMutation.mutateAsync({
          applicationId: candidate.id,
          scheduledAt,
          type: interviewType as InterviewType,
          format: (interviewFormat as InterviewFormat) || "MEET",
          linkOrLocation: linkOrLocation.trim(),
          interviewerId,
          notes: interviewNotes.trim() || undefined,
          round: (candidate.interviews?.length || 0) + 1,
          sendInvitationEmail: canViewEmail ? sendEmailInvite : false,
          ...(canViewEmail && sendEmailInvite && selectedTemplateId
            ? { templateId: selectedTemplateId }
            : {}),
        });
      }

      onInterviewScheduled?.(interviewInfo);
      onClose();
    } catch (err) {
      console.error("Schedule interview failed:", err);
      setFormError(getApiErrorMessage(err, t));
      // Defense-in-depth: hooks (useCreateInterviewMutation,
      // useUpdateInterviewMutation) already invalidate on error.
      // This explicit call is belt-and-suspenders for legacy safety.
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
  };

  const isSaving =
    createInterviewMutation.isPending || updateInterviewMutation.isPending;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingInterview
          ? t("interviews.editScheduleBtn")
          : t("interviews.modalTitle")
      }
      description={t("interviews.modalSubtitle")}
      size="3xl"
    >
      <div className="flex-1 overflow-y-auto p-6 md:p-7">
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveInterview} className="space-y-5 pt-4">
          {/* Section 1: Job & Candidate Selection */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span>{t("interviews.targetJobAndCandidate")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Job Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("interviews.targetJob")}
                </label>
                <CustomSelect
                  value={modalJobId}
                  onChange={(newJobId) => {
                    setModalJobId(newJobId);
                    setModalCandidateId("");
                  }}
                  disabled={Boolean(selectedJobId && selectedApplicationId)}
                  placeholder={
                    jobs.length === 0
                      ? t("interviews.noJobsAvailable")
                      : t("interviews.placeholders.selectJob")
                  }
                  options={
                    jobs.length === 0
                      ? [
                          {
                            value: "",
                            label: t("interviews.noJobsAvailable"),
                            disabled: true,
                          },
                        ]
                      : jobs.map((j) => ({
                          value: j.id,
                          label: `${j.title} (${j.department})`,
                        }))
                  }
                  className="w-full"
                  triggerClassName="h-10 text-xs font-medium"
                />
              </div>

              {/* Candidate Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>
                    {t("interviews.targetCandidate")}{" "}
                    <span className="text-rose-500">*</span>
                  </span>
                  {currentCandidate && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {t("interviews.stageLabel")}{" "}
                      <strong className="font-semibold text-primary">
                        {currentCandidate.stage}
                      </strong>
                    </span>
                  )}
                </label>
                <CustomSelect
                  value={modalCandidateId}
                  onChange={(val) => handleCandidateChange(val)}
                  disabled={Boolean(selectedApplicationId)}
                  placeholder={
                    !modalJobId && jobs.length > 0
                      ? t("interviews.placeholders.selectJobFirst")
                      : modalCandidates.length === 0
                        ? t("interviews.noCandidatesForJob")
                        : t("interviews.placeholders.selectCandidate")
                  }
                  options={
                    modalCandidates.length === 0
                      ? [
                          {
                            value: "",
                            label: modalJobId
                              ? t("interviews.noCandidatesForJob")
                              : t("interviews.placeholders.selectJobFirst"),
                            disabled: true,
                          },
                        ]
                      : modalCandidates.map((c) => ({
                          value: c.id,
                          label: `${getCandidateDisplayName(c)} — ${c.candidateEmail}`,
                        }))
                  }
                  className="w-full"
                  triggerClassName="h-10 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2, 3, 4: Timing, Round, Format, Location */}
          <ScheduleInterviewTimingFields
            interviewDate={interviewDate}
            onDateChange={setInterviewDate}
            interviewTime={interviewTime}
            onTimeChange={setInterviewTime}
            interviewType={interviewType}
            onTypeChange={setInterviewType}
            interviewFormat={interviewFormat}
            onFormatChange={setInterviewFormat}
            linkOrLocation={linkOrLocation}
            onLinkOrLocationChange={setLinkOrLocation}
          />

          {/* Section 5: Interviewer, Notes, Email */}
          <ScheduleInterviewInterviewerFields
            interviewerId={interviewerId}
            onInterviewerIdChange={setInterviewerId}
            interviewNotes={interviewNotes}
            onNotesChange={setInterviewNotes}
            members={members}
            isEditing={Boolean(editingInterview)}
            sendEmailInvite={sendEmailInvite}
            onSendEmailInviteChange={(val) => {
              hasTouchedEmailRef.current = true;
              setSendEmailInvite(val);
            }}
            canViewEmail={canViewEmail}
            selectedTemplateId={selectedTemplateId}
            onSelectedTemplateIdChange={(val) => {
              hasTouchedTemplateRef.current = true;
              setSelectedTemplateId(val);
            }}
            activeTemplates={activeTemplates}
            isSaving={isSaving}
          />

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 rounded-md text-xs font-semibold cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 px-5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer shadow-xs"
            >
              {isSaving
                ? t("interviews.savingSchedule")
                : editingInterview
                  ? t("interviews.updateSchedule")
                  : t("interviews.confirmSchedule")}
            </Button>
          </div>
        </form>
      </div>
    </CustomModal>
  );
}
