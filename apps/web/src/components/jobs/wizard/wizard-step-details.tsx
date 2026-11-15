"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { useI18n } from "@/i18n";
import type { JobType, ExperienceLevel, WorkplaceType } from "@/types";
import { WizardStepClassificationFields } from "./step-details/wizard-step-classification-fields";
import { WizardStepCompensationAccordion } from "./step-details/wizard-step-compensation-accordion";

export type Step1Field =
  | "title"
  | "location"
  | "description"
  | "employmentType"
  | "experienceLevel"
  | "workplace"
  | "currency"
  | "salaryPer";

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
  requirements: string;
  setRequirements: (val: string) => void;
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
  requirements,
  setRequirements,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("jobs.wizard.jobDetailsTitle")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {t("jobs.wizard.jobDetailsDesc")}{" "}
          <span className="underline decoration-slate-300 dark:decoration-slate-700 cursor-pointer">
            {t("jobs.wizard.saveChangesLink")}
          </span>
        </p>
      </div>

      <div className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Field 1 & 1.5: Job Title & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("jobs.wizard.jobTitleLabel")}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.title")}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
              className={cn(
                "h-10 text-xs bg-slate-50/50 dark:bg-slate-950 transition-colors",
                showTitleError &&
                  "border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
              )}
              required
            />
            {showTitleError && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {t("jobs.wizard.errors.titleRequired")}
              </p>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("jobs.wizard.departmentLabel")}
            </label>
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.department")}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {t("jobs.wizard.departmentHint")}
            </p>
          </div>
        </div>

        {/* Field 2 & 3: Location & Postal Code */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("jobs.wizard.locationLabel")}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder={t("jobs.wizard.placeholders.location")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, location: true }))
                }
                className={cn(
                  "h-10 pl-9 text-xs bg-slate-50/50 dark:bg-slate-950 transition-colors",
                  showLocationError &&
                    "border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
                )}
                required
              />
            </div>
            {showLocationError ? (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {t("jobs.wizard.locationErrorHelp")}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {t("jobs.wizard.locationDesc")}
              </p>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("jobs.wizard.postalCodeLabel")}{" "}
              <span className="text-slate-400 font-normal">
                ({t("common.optional")})
              </span>
            </label>
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.postalCode")}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950"
            />
            <p className="text-[11px] text-slate-400 mt-1">
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

        {/* Field 8: Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            {t("jobs.wizard.descriptionTitle")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <Textarea
            placeholder={t("jobs.wizard.placeholders.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, description: true }))
            }
            className={cn(
              "h-40 text-xs bg-slate-50/50 dark:bg-slate-950 resize-none overflow-y-auto transition-colors",
              showDescriptionError &&
                "border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
            )}
            required
          />
          <div className="flex items-center justify-between text-[11px] mt-1">
            {showDescriptionError ? (
              <span className="text-rose-500 font-medium">
                {t("jobs.wizard.errors.descRequired")}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                {t("jobs.wizard.descriptionHelpText")}
              </span>
            )}
            <span
              className={
                showDescriptionError
                  ? "text-rose-500 font-semibold shrink-0 ml-2"
                  : isDescriptionValid
                    ? "text-emerald-600 font-semibold shrink-0 ml-2"
                    : "text-slate-400 font-medium shrink-0 ml-2"
              }
            >
              {description.trim().length > 0
                ? `${description.trim().length} ${t("jobs.wizard.charsCount")}`
                : t("common.required")}
            </span>
          </div>
        </div>

        {/* Field 9: Requirements */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            {t("jobs.wizard.requirementsTitle")}
          </label>
          <Textarea
            placeholder={t("jobs.wizard.placeholders.requirements")}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="h-32 text-xs bg-slate-50/50 dark:bg-slate-950 resize-none overflow-y-auto transition-colors"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {t("jobs.wizard.requirementsNotice")}
          </p>
        </div>
      </div>

      {/* Bottom Step 1 Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          {t("common.cancel")}
        </Button>

        <Button
          type="button"
          onClick={onContinue}
          disabled={!isStep1Valid}
          className={cn(
            "text-white text-xs font-bold px-6 py-2 rounded-xl shadow-xs transition-all",
            isStep1Valid
              ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              : "bg-blue-600/50 cursor-not-allowed opacity-60",
          )}
        >
          {t("jobs.wizard.continueToPublish")}
        </Button>
      </div>
    </div>
  );
}
