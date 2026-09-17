"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Briefcase,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Layers,
} from "lucide-react";
import {
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useUpdateStageMutation,
  useOrgMembers,
} from "@/hooks/use-queries";
import { getCandidateDisplayName } from "@/lib/utils";
import {
  type ScheduledInterviewInfo,
  normalizeInterviewType,
  INTERVIEW_TYPE_OPTIONS,
} from "@/lib/interviews";
import { useI18n } from "@/i18n";
import type { Application, Job, Interview, InterviewType, InterviewFormat } from "@/types";

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
  const { data: members = [] } = useOrgMembers();
  const createInterviewMutation = useCreateInterviewMutation();
  const updateInterviewMutation = useUpdateInterviewMutation();
  const updateStageMutation = useUpdateStageMutation();

  const [modalJobId, setModalJobId] = useState<string>("");
  const [modalCandidateId, setModalCandidateId] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState<string>("");
  const [interviewTime, setInterviewTime] = useState<string>("");
  const [interviewType, setInterviewType] = useState<InterviewType | "">("");
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat | "">("");
  const [linkOrLocation, setLinkOrLocation] = useState<string>("");
  const [interviewerName, setInterviewerName] = useState<string>("");
  const [interviewNotes, setInterviewNotes] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Filter candidates for selected job
  const modalCandidates = useMemo(() => {
    if (!modalJobId) return applications;
    return applications.filter((app) => String(app.jobId) === String(modalJobId));
  }, [applications, modalJobId]);

  // Current selected candidate
  const currentCandidate = useMemo(() => {
    return applications.find((a) => a.id === modalCandidateId);
  }, [applications, modalCandidateId]);

  // Sync state when modal opens or selections change
  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);

    // 1. Determine target candidate & job
    let candidateToUse: Application | undefined;
    if (selectedApplicationId) {
      candidateToUse = applications.find((a) => a.id === selectedApplicationId);
    } else if (editingInterview?.applicationId) {
      candidateToUse = applications.find((a) => a.id === editingInterview.applicationId);
    }

    if (editingInterview) {
      // Cập nhật lịch: đẩy toàn bộ dữ liệu của buổi phỏng vấn vào các trường
      const initialJobId = selectedJobId || candidateToUse?.jobId || "";
      setModalJobId(initialJobId);
      setModalCandidateId(editingInterview.applicationId || selectedApplicationId || "");
      setInterviewDate(editingInterview.date || "");
      setInterviewTime(editingInterview.time || "");
      setInterviewType(normalizeInterviewType(editingInterview.type));
      setInterviewFormat((editingInterview.format as InterviewFormat) || "MEET");
      setLinkOrLocation(editingInterview.linkOrLocation || "");
      setInterviewerName(editingInterview.interviewer || "");
      setInterviewNotes(editingInterview.notes || "");
    } else {
      // Lên lịch mới: tất cả các trường bắt đầu rỗng / không điền sẵn
      const initialJobId = selectedJobId || candidateToUse?.jobId || "";
      setModalJobId(initialJobId);
      setModalCandidateId(selectedApplicationId || "");
      setInterviewDate(initialDate || "");
      setInterviewTime("");
      setInterviewType("");
      setInterviewFormat("");
      setLinkOrLocation("");
      setInterviewerName("");
      setInterviewNotes("");
    }
  }, [isOpen, selectedJobId, selectedApplicationId, initialDate, editingInterview, applications]);

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
    if (!interviewerName.trim()) {
      setFormError(t("interviews.errors.enterInterviewer"));
      return;
    }

    const candidate = applications.find((a) => a.id === modalCandidateId);
    if (!candidate) {
      setFormError(t("interviews.errors.candidateNotFound"));
      return;
    }

    const interviewInfo: ScheduledInterviewInfo = {
      id: editingInterview?.id,
      applicationId: candidate.id,
      date: interviewDate,
      time: interviewTime,
      type: interviewType as InterviewType,
      format: interviewFormat as InterviewFormat,
      linkOrLocation: linkOrLocation.trim(),
      interviewer: interviewerName.trim(),
      notes: interviewNotes.trim(),
    };

    try {
      if (editingInterview?.id) {
        // Cập nhật lịch phỏng vấn hiện có
        await updateInterviewMutation.mutateAsync({
          id: editingInterview.id,
          data: {
            date: interviewDate,
            time: interviewTime,
            type: interviewType as InterviewType,
            format: (interviewFormat as InterviewFormat) || "MEET",
            linkOrLocation: linkOrLocation.trim(),
            interviewer: interviewerName.trim(),
            notes: interviewNotes.trim() || undefined,
          },
        });
      } else {
        // Tạo lịch phỏng vấn mới
        await createInterviewMutation.mutateAsync({
          applicationId: candidate.id,
          date: interviewDate,
          time: interviewTime,
          type: interviewType as InterviewType,
          format: (interviewFormat as InterviewFormat) || "MEET",
          linkOrLocation: linkOrLocation.trim(),
          interviewer: interviewerName.trim(),
          notes: interviewNotes.trim() || undefined,
          round: (candidate.interviews?.length || 0) + 1,
        });

        // If candidate is still in APPLIED/SCREENING stage, advance to INTERVIEW stage
        if (candidate.stage !== "INTERVIEW" && candidate.stage !== "OFFER" && candidate.stage !== "HIRED") {
          await updateStageMutation.mutateAsync({
            id: candidate.id,
            stage: "INTERVIEW",
            orderIndex: 0,
          });
        }
      }

      onInterviewScheduled?.(interviewInfo);
      onClose();
    } catch (err) {
      console.error("Schedule interview failed:", err);
      setFormError(t("interviews.errors.saveFailed"));
    }
  };

  const isSaving =
    createInterviewMutation.isPending ||
    updateInterviewMutation.isPending ||
    updateStageMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-2xl md:max-w-3xl rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {editingInterview ? t("interviews.editScheduleBtn") : t("interviews.modalTitle")}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("interviews.modalSubtitle")}
              </p>
            </div>
          </div>
        </DialogHeader>

        {formError && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveInterview} className="space-y-5 pt-4">
          {/* Section 1: Job & Candidate Selection */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t("interviews.targetJobAndCandidate")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Job Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("interviews.targetJob")}
                </label>
                <CustomSelect
                  value={modalJobId}
                  onChange={(newJobId) => {
                    setModalJobId(newJobId);
                    setModalCandidateId("");
                  }}
                  disabled={Boolean(selectedJobId && selectedApplicationId)}
                  placeholder={jobs.length === 0 ? t("interviews.noJobsAvailable") : t("interviews.placeholders.selectJob")}
                  options={
                    jobs.length === 0
                      ? [{ value: "", label: t("interviews.noJobsAvailable"), disabled: true }]
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{t("interviews.targetCandidate")} <span className="text-rose-500">*</span></span>
                  {currentCandidate && (
                    <span className="text-[10px] font-normal text-slate-400">
                      {t("interviews.stageLabel")} <strong className="font-semibold text-blue-600 dark:text-blue-400">{currentCandidate.stage}</strong>
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
                      ? [{ value: "", label: modalJobId ? t("interviews.noCandidatesForJob") : t("interviews.placeholders.selectJobFirst"), disabled: true }]
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

          {/* Section 2: Date, Time & Round Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Interview Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("interviews.interviewDate")} <span className="text-rose-500">*</span></span>
              </label>
              <Input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            {/* Interview Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("interviews.interviewTime")} <span className="text-rose-500">*</span></span>
              </label>
              <Input
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                required
              />
            </div>
          </div>

          {/* Section 3: Round & Format Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Round Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("interviews.roundType")} <span className="text-rose-500">*</span></span>
              </label>
              <CustomSelect
                value={interviewType}
                onChange={(val) => setInterviewType(val as InterviewType)}
                placeholder={t("interviews.placeholders.selectRoundType")}
                options={INTERVIEW_TYPE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: t(opt.labelKey),
                }))}
                className="w-full"
                triggerClassName="h-10 text-xs font-medium"
              />
            </div>

            {/* Meeting Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                {interviewFormat === "OFFICE" ? (
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <Video className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span>{t("interviews.formatLabel")} <span className="text-rose-500">*</span></span>
              </label>
              <CustomSelect
                value={interviewFormat}
                onChange={(val) => setInterviewFormat(val as InterviewFormat)}
                placeholder={t("interviews.placeholders.selectFormat")}
                options={[
                  { value: "MEET", label: t("interviews.formats.meet") },
                  { value: "ZOOM", label: t("interviews.formats.zoom") },
                  { value: "TEAMS", label: t("interviews.formats.teams") },
                  { value: "OFFICE", label: t("interviews.formats.office") },
                ]}
                className="w-full"
                triggerClassName="h-10 text-xs font-medium"
              />
            </div>
          </div>

          {/* Section 4: Meeting Link or Office Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {interviewFormat === "OFFICE"
                  ? t("interviews.officeAddressLabel")
                  : t("interviews.meetingUrlLabel")}
              </span>
            </label>
            <Input
              type="text"
              placeholder={
                interviewFormat === "OFFICE"
                  ? t("interviews.placeholders.officeLocation")
                  : t("interviews.placeholders.meetingUrl")
              }
              value={linkOrLocation}
              onChange={(e) => setLinkOrLocation(e.target.value)}
              className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Section 5: Interviewer & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t("interviews.primaryInterviewer")} <span className="text-rose-500">*</span></span>
                </span>
                {members.length > 0 && (
                  <CustomSelect
                    size="sm"
                    align="right"
                    value=""
                    placeholder={t("interviews.selectFromMembers")}
                    onChange={(val) => {
                      if (val) setInterviewerName(val);
                    }}
                    options={[
                      { value: "", label: t("interviews.selectFromMembers"), disabled: true },
                      ...members.map((m) => ({
                        value: `${m.name} (${m.role})`,
                        label: `${m.name} (${m.email})`,
                      })),
                    ]}
                    className="w-auto"
                    triggerClassName="h-6 py-0.5 px-2 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 rounded-lg"
                    popupClassName="min-w-[220px]"
                  />
                )}
              </label>
              <Input
                type="text"
                placeholder={t("interviews.placeholders.interviewer")}
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("interviews.notesOrRequirements")}</span>
              </label>
              <Input
                type="text"
                placeholder={t("interviews.placeholders.notes")}
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer transition-all"
            >
              {isSaving
                ? t("interviews.savingSchedule")
                : editingInterview
                ? t("interviews.updateSchedule")
                : t("interviews.confirmSchedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
