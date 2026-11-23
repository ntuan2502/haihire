"use client";

import { Briefcase } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import { getCandidateDisplayName } from "@/lib/utils";
import type { Application, Job } from "@/types";

interface ScheduleInterviewTargetFieldsProps {
  jobs: Job[];
  modalJobId: string;
  onJobChange: (jobId: string) => void;
  modalCandidateId: string;
  onCandidateChange: (candidateId: string) => void;
  modalCandidates: Application[];
  currentCandidate?: Application;
  isSaving: boolean;
  isJobLocked: boolean;
  isCandidateLocked: boolean;
}

/**
 * Job and candidate selector card inside ScheduleInterviewModal.
 */
export function ScheduleInterviewTargetFields({
  jobs,
  modalJobId,
  onJobChange,
  modalCandidateId,
  onCandidateChange,
  modalCandidates,
  currentCandidate,
  isSaving,
  isJobLocked,
  isCandidateLocked,
}: ScheduleInterviewTargetFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        <Briefcase className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span>{t("interviews.targetJobAndCandidate")}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            {t("interviews.targetJob")}
          </label>
          <CustomSelect
            value={modalJobId}
            onChange={onJobChange}
            disabled={isSaving || isJobLocked}
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
                    label: j.department
                      ? `${j.title} (${j.department})`
                      : j.title,
                  }))
            }
            className="w-full"
            triggerClassName="h-10 text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between gap-2">
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
            onChange={onCandidateChange}
            disabled={isSaving || isCandidateLocked}
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
  );
}
