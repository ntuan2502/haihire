"use client";

import { useState, useMemo, useRef, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FormModal } from "@/components/shared";
import { useFlowTemplateSelection } from "@/components/email/flow-template-selector";
import { ScheduleInterviewTargetFields } from "./schedule/schedule-interview-target-fields";
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
import { resolveEffectiveTimezone } from "@/lib/utils";
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
  onJobChange?: (jobId: string) => void;
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
  onJobChange,
  onInterviewScheduled,
}: ScheduleInterviewModalProps) {
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );
  const queryClient = useQueryClient();
  const canCreateInterviews = useHasPermission("interview:create");
  const canUpdateInterviews = useHasPermission("interview:update");
  const { data: members = [] } = useOrgInterviewers({
    enabled: isOpen && (canCreateInterviews || canUpdateInterviews),
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
  const [sendEmailInvite, setSendEmailInvite] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const hasTouchedEmailRef = useRef(false);
  const hasTouchedTemplateRef = useRef(false);
  const hasTouchedScheduleRef = useRef(false);
  const initializedSessionRef = useRef<string | null>(null);
  const initializedTimezoneRef = useRef<string | null>(null);

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
      setSendEmailInvite(false);
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
      initializedTimezoneRef.current = null;
      hasTouchedScheduleRef.current = false;
      return;
    }

    const sessionKey = `${selectedJobId ?? ""}:${selectedApplicationId ?? ""}:${editingInterview?.id ?? ""}:${initialDate ?? ""}`;

    // Determine target candidate & job
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
      // If localization timezone finishes hydrating before user edits date/time, update extracted schedule
      if (
        editingInterview &&
        initializedTimezoneRef.current !== effectiveTimezone &&
        !hasTouchedScheduleRef.current
      ) {
        const { date, time } = extractDateTimeInTimezone(
          editingInterview.scheduledAt,
          effectiveTimezone,
        );
        setInterviewDate(date);
        setInterviewTime(time);
        initializedTimezoneRef.current = effectiveTimezone;
      }
      return;
    }
    initializedSessionRef.current = sessionKey;
    initializedTimezoneRef.current = effectiveTimezone;

    setFormError(null);

    if (editingInterview) {
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
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
  };

  const isSaving =
    createInterviewMutation.isPending || updateInterviewMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSaveInterview}
      title={
        editingInterview
          ? t("interviews.editScheduleBtn")
          : t("interviews.modalTitle")
      }
      description={t("interviews.modalSubtitle")}
      size="lg"
      noValidate={true}
      isSubmitting={isSaving}
      submitLabel={
        editingInterview
          ? t("interviews.updateSchedule")
          : t("interviews.confirmSchedule")
      }
      savingLabel={t("interviews.savingSchedule")}
      cancelLabel={t("common.cancel")}
      error={formError}
    >
      {/* Section 1: Job & Candidate Selection */}
      <ScheduleInterviewTargetFields
        jobs={jobs}
        modalJobId={modalJobId}
        onJobChange={(newJobId) => {
          setModalJobId(newJobId);
          setModalCandidateId("");
          onJobChange?.(newJobId);
        }}
        modalCandidateId={modalCandidateId}
        onCandidateChange={handleCandidateChange}
        modalCandidates={modalCandidates}
        currentCandidate={currentCandidate}
        isSaving={isSaving}
        isJobLocked={Boolean(selectedJobId && selectedApplicationId)}
        isCandidateLocked={Boolean(selectedApplicationId)}
      />

      {/* Section 2, 3, 4: Timing, Round, Format, Location */}
      <ScheduleInterviewTimingFields
        interviewDate={interviewDate}
        onDateChange={(val) => {
          hasTouchedScheduleRef.current = true;
          setInterviewDate(val);
        }}
        interviewTime={interviewTime}
        onTimeChange={(val) => {
          hasTouchedScheduleRef.current = true;
          setInterviewTime(val);
        }}
        interviewType={interviewType}
        onTypeChange={setInterviewType}
        interviewFormat={interviewFormat}
        onFormatChange={setInterviewFormat}
        linkOrLocation={linkOrLocation}
        onLinkOrLocationChange={setLinkOrLocation}
        disabled={isSaving}
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
    </FormModal>
  );
}
