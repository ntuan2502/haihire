"use client";

import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import type { JobType, ExperienceLevel, WorkplaceType } from "@/types";
import type { Step1TouchedState } from "../wizard-step-details";

interface WizardStepClassificationFieldsProps {
  employmentType: JobType | "";
  setEmploymentType: (val: JobType) => void;
  experienceLevel: ExperienceLevel | "";
  setExperienceLevel: (val: ExperienceLevel) => void;
  workplace: WorkplaceType | "";
  setWorkplace: (val: WorkplaceType) => void;
  showEmploymentTypeError: boolean;
  showExperienceLevelError: boolean;
  showWorkplaceError: boolean;
  setTouched: React.Dispatch<React.SetStateAction<Step1TouchedState>>;
}

export function WizardStepClassificationFields({
  employmentType,
  setEmploymentType,
  experienceLevel,
  setExperienceLevel,
  workplace,
  setWorkplace,
  showEmploymentTypeError,
  showExperienceLevelError,
  showWorkplaceError,
  setTouched,
}: WizardStepClassificationFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          {t("jobs.wizard.employmentTypeLabel")}{" "}
          <span className="text-destructive">*</span>
        </label>
        <CustomSelect
          value={employmentType || ""}
          onChange={(val) => {
            setEmploymentType(val as JobType);
            setTouched((prev) => ({ ...prev, employmentType: true }));
          }}
          placeholder={t("jobs.wizard.selectEmploymentType")}
          options={[
            { value: "FULL_TIME", label: t("jobs.fullTime") },
            { value: "PART_TIME", label: t("jobs.partTime") },
            { value: "CONTRACT", label: t("jobs.contract") },
            { value: "INTERNSHIP", label: t("jobs.internship") },
          ]}
          className="w-full"
          triggerClassName={cn(
            "w-full h-10 text-xs font-normal",
            showEmploymentTypeError &&
              "border-destructive ring-1 ring-destructive/30",
          )}
        />
        {showEmploymentTypeError && (
          <p className="text-[11px] text-destructive mt-1 font-medium">
            {t("jobs.wizard.employmentTypeError")}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          {t("jobs.wizard.experienceLevelLabel")}{" "}
          <span className="text-destructive">*</span>
        </label>
        <CustomSelect
          value={experienceLevel || ""}
          onChange={(val) => {
            setExperienceLevel(val as ExperienceLevel);
            setTouched((prev) => ({ ...prev, experienceLevel: true }));
          }}
          placeholder={t("jobs.wizard.selectExperienceLevel")}
          options={[
            { value: "ENTRY_LEVEL", label: t("jobs.experience.junior") },
            { value: "MID_LEVEL", label: t("jobs.experience.mid") },
            { value: "SENIOR_LEVEL", label: t("jobs.experience.senior") },
            { value: "LEAD", label: t("jobs.experience.lead") },
            { value: "EXECUTIVE", label: t("jobs.experience.executive") },
          ]}
          className="w-full"
          triggerClassName={cn(
            "w-full h-10 text-xs font-normal",
            showExperienceLevelError &&
              "border-destructive ring-1 ring-destructive/30",
          )}
        />
        {showExperienceLevelError && (
          <p className="text-[11px] text-destructive mt-1 font-medium">
            {t("jobs.wizard.experienceLevelError")}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          {t("jobs.wizard.workplaceLabel")}{" "}
          <span className="text-destructive">*</span>
        </label>
        <CustomSelect
          value={workplace || ""}
          onChange={(val) => {
            setWorkplace(val as WorkplaceType);
            setTouched((prev) => ({ ...prev, workplace: true }));
          }}
          placeholder={t("jobs.wizard.selectWorkplace")}
          options={[
            { value: "ON_SITE", label: t("jobs.workplace.onsite") },
            { value: "HYBRID", label: t("jobs.workplace.hybrid") },
            { value: "REMOTE", label: t("jobs.workplace.remote") },
          ]}
          className="w-full"
          triggerClassName={cn(
            "w-full h-10 text-xs font-normal",
            showWorkplaceError &&
              "border-destructive ring-1 ring-destructive/30",
          )}
        />
        {showWorkplaceError && (
          <p className="text-[11px] text-destructive mt-1 font-medium">
            {t("jobs.wizard.workplaceError")}
          </p>
        )}
      </div>
    </div>
  );
}
