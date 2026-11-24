"use client";

import React from "react";
import { Search } from "lucide-react";
import { extractPlainTextFromHtml } from "@haihire/shared";
import { RichTextEditor } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { useI18n } from "@/i18n";
import type { JobType, ExperienceLevel, WorkplaceType } from "@/types";
import { WizardStepClassificationFields } from "./step-details/wizard-step-classification-fields";
import { WizardStepScheduleHeadcountAccordion } from "./step-details/wizard-step-schedule-headcount-accordion";
import { WizardStepCompensationAccordion } from "./step-details/wizard-step-compensation-accordion";

export type Step1Field =
  | "title"
  | "location"
  | "description"
  | "employmentType"
  | "experienceLevel"
  | "workplace"
  | "currency"
  | "salaryPer"
  | "openings";

export type Step1TouchedState = Record<Step1Field, boolean>;

export interface WizardStepDetailsProps {
  jobTitle: string;
  setJobTitle: (val: string) => void;
  department: string;
  setDepartment: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  postalCode: string;
  setPostalCode: (val: string) => void;
  employmentType: JobType | "";
  setEmploymentType: (val: JobType) => void;
  experienceLevel: ExperienceLevel | "";
  setExperienceLevel: (val: ExperienceLevel) => void;
  workplace: WorkplaceType | "";
  setWorkplace: (val: WorkplaceType) => void;
  scheduleOpen: boolean;
  setScheduleOpen: (val: boolean) => void;
  applicationDeadline: string;
  setApplicationDeadline: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  openings: string;
  setOpenings: (val: string) => void;
  showOpeningsError: boolean;
  compensationOpen: boolean;
  setCompensationOpen: (val: boolean) => void;
  payNegotiable: boolean;
  setPayNegotiable: (val: boolean) => void;
  minSalary: string;
  setMinSalary: (val: string) => void;
  maxSalary: string;
  setMaxSalary: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  salaryPer: string;
  setSalaryPer: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  touched: Step1TouchedState;
  setTouched: React.Dispatch<React.SetStateAction<Step1TouchedState>>;
  showTitleError: boolean;
  showLocationError: boolean;
  showEmploymentTypeError: boolean;
  showExperienceLevelError: boolean;
  showWorkplaceError: boolean;
  hasSalaryData: boolean;
  showCurrencyError: boolean;
  showSalaryPerError: boolean;
  showDescriptionError: boolean;
  isDescriptionValid: boolean;
  isStep1Valid: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function WizardStepDetails({
  jobTitle,
  setJobTitle,
  department,
  setDepartment,
  location,
  setLocation,
  postalCode,
  setPostalCode,
  employmentType,
  setEmploymentType,
  experienceLevel,
  setExperienceLevel,
  workplace,
  setWorkplace,
  scheduleOpen,
  setScheduleOpen,
  applicationDeadline,
  setApplicationDeadline,
  startDate,
  setStartDate,
  openings,
  setOpenings,
  showOpeningsError,
  compensationOpen,
  setCompensationOpen,
  payNegotiable,
  setPayNegotiable,
  minSalary,
  setMinSalary,
  maxSalary,
  setMaxSalary,
  currency,
  setCurrency,
  salaryPer,
  setSalaryPer,
  description,
  setDescription,
  setTouched,
  showTitleError,
  showLocationError,
  showEmploymentTypeError,
  showExperienceLevelError,
  showWorkplaceError,
  hasSalaryData,
  showCurrencyError,
  showSalaryPerError,
  showDescriptionError,
  isDescriptionValid,
  isStep1Valid,
  onContinue,
  onCancel,
}: WizardStepDetailsProps) {
  const { t } = useI18n();
  const descriptionCharCount = extractPlainTextFromHtml(description).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("jobs.wizard.jobDetailsTitle")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {t("jobs.wizard.jobDetailsDesc")}
        </p>
      </div>

      <div className="space-y-5 bg-card text-card-foreground p-6 rounded-xl border border-border shadow-xs">
        {/* Field 1 & 1.5: Job Title & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t("jobs.wizard.jobTitleLabel")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.title")}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
              className={cn(
                "h-10 text-xs transition-colors",
                showTitleError &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
              )}
              required
            />
            {showTitleError && (
              <p className="text-[11px] text-destructive font-medium mt-1">
                {t("jobs.wizard.errors.titleRequired")}
              </p>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t("jobs.wizard.departmentLabel")}
            </label>
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.department")}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-10 text-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("jobs.wizard.departmentHint")}
            </p>
          </div>
        </div>

        {/* Field 2 & 3: Location & Postal Code */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t("jobs.wizard.locationLabel")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("jobs.wizard.placeholders.location")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, location: true }))
                }
                className={cn(
                  "h-10 pl-9 text-xs transition-colors",
                  showLocationError &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
                required
              />
            </div>
            {showLocationError ? (
              <p className="text-[11px] text-destructive font-medium mt-1">
                {t("jobs.wizard.locationErrorHelp")}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("jobs.wizard.locationDesc")}
              </p>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t("jobs.wizard.postalCodeLabel")}{" "}
              <span className="text-muted-foreground font-normal">
                ({t("common.optional")})
              </span>
            </label>
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.postalCode")}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="h-10 text-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("jobs.wizard.pickLocationFirst")}
            </p>
          </div>
        </div>

        {/* Field 4, 5, 6: Employment type, Experience level, Workplace */}
        <WizardStepClassificationFields
          employmentType={employmentType}
          setEmploymentType={setEmploymentType}
          experienceLevel={experienceLevel}
          setExperienceLevel={setExperienceLevel}
          workplace={workplace}
          setWorkplace={setWorkplace}
          showEmploymentTypeError={showEmploymentTypeError}
          showExperienceLevelError={showExperienceLevelError}
          showWorkplaceError={showWorkplaceError}
          setTouched={setTouched}
        />

        {/* Field 6.5: Deadline, Start Date & Headcount Accordion */}
        <WizardStepScheduleHeadcountAccordion
          scheduleOpen={scheduleOpen}
          setScheduleOpen={setScheduleOpen}
          applicationDeadline={applicationDeadline}
          setApplicationDeadline={setApplicationDeadline}
          startDate={startDate}
          setStartDate={setStartDate}
          openings={openings}
          setOpenings={setOpenings}
          showOpeningsError={showOpeningsError}
          setTouched={setTouched}
        />

        {/* Field 7: Compensation Accordion Card */}
        <WizardStepCompensationAccordion
          compensationOpen={compensationOpen}
          setCompensationOpen={setCompensationOpen}
          payNegotiable={payNegotiable}
          setPayNegotiable={setPayNegotiable}
          minSalary={minSalary}
          setMinSalary={setMinSalary}
          maxSalary={maxSalary}
          setMaxSalary={setMaxSalary}
          currency={currency}
          setCurrency={setCurrency}
          salaryPer={salaryPer}
          setSalaryPer={setSalaryPer}
          hasSalaryData={hasSalaryData}
          showCurrencyError={showCurrencyError}
          showSalaryPerError={showSalaryPerError}
          setTouched={setTouched}
        />

        {/* Field 8: Unified Description (WYSIWYG) */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {t("jobs.wizard.descriptionTitle")}{" "}
            <span className="text-destructive">*</span>
          </label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, description: true }))
            }
            placeholder={t("jobs.wizard.placeholders.description")}
            ariaLabel={t("jobs.wizard.descriptionTitle")}
            hasError={showDescriptionError}
          />
          <div className="flex items-center justify-between text-[11px] mt-1">
            {showDescriptionError ? (
              <span className="text-destructive font-medium">
                {t("jobs.wizard.errors.descRequired")}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t("jobs.wizard.descriptionHelpText")}
              </span>
            )}
            <span
              className={
                showDescriptionError
                  ? "text-destructive font-semibold shrink-0 ml-2"
                  : isDescriptionValid
                    ? "text-emerald-600 font-semibold shrink-0 ml-2"
                    : "text-muted-foreground font-medium shrink-0 ml-2"
              }
            >
              {descriptionCharCount > 0
                ? `${descriptionCharCount} ${t("jobs.wizard.charsCount")}`
                : t("common.required")}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Step 1 Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-xs cursor-pointer"
        >
          {t("common.cancel")}
        </Button>

        <Button
          type="button"
          onClick={onContinue}
          disabled={!isStep1Valid}
          className="text-xs font-semibold px-6 cursor-pointer"
        >
          {t("jobs.wizard.continueToPublish")}
        </Button>
      </div>
    </div>
  );
}
