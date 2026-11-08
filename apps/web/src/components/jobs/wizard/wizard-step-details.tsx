"use client";

import React from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared";
import { cn } from "cn";
import { useI18n } from "@/i18n";
import type { JobType, ExperienceLevel, WorkplaceType } from "@/types";

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("jobs.wizard.employmentTypeLabel")}{" "}
              <span className="text-rose-500">*</span>
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
                "w-full h-10 text-xs font-normal bg-slate-50/50 dark:bg-slate-950 rounded-xl",
                showEmploymentTypeError &&
                  "border-rose-500 ring-1 ring-rose-500",
              )}
            />
            {showEmploymentTypeError && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">
                {t("jobs.wizard.employmentTypeError")}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("jobs.wizard.experienceLevelLabel")}{" "}
              <span className="text-rose-500">*</span>
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
                "w-full h-10 text-xs font-normal bg-slate-50/50 dark:bg-slate-950 rounded-xl",
                showExperienceLevelError &&
                  "border-rose-500 ring-1 ring-rose-500",
              )}
            />
            {showExperienceLevelError && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">
                {t("jobs.wizard.experienceLevelError")}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("jobs.wizard.workplaceLabel")}{" "}
              <span className="text-rose-500">*</span>
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
                "w-full h-10 text-xs font-normal bg-slate-50/50 dark:bg-slate-950 rounded-xl",
                showWorkplaceError && "border-rose-500 ring-1 ring-rose-500",
              )}
            />
            {showWorkplaceError && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">
                {t("jobs.wizard.workplaceError")}
              </p>
            )}
          </div>
        </div>

        {/* Field 7: Compensation Accordion Card */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 transition-all">
          <button
            type="button"
            onClick={() => setCompensationOpen(!compensationOpen)}
            className={cn(
              "w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors",
              !compensationOpen ? "rounded-xl" : "rounded-t-xl",
            )}
          >
            <div className="flex items-center gap-2">
              {compensationOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("jobs.wizard.compensationTitle")}
              </span>
              <span className="rounded-md bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                {t("jobs.wizard.compensationOptional")}
              </span>
            </div>
          </button>

          {!compensationOpen ? (
            <div className="px-4 pb-4 pt-0 text-[11px] text-slate-500 dark:text-slate-400">
              {t("jobs.wizard.compensationHintClosed")}
            </div>
          ) : (
            <div className="px-4 pb-5 pt-0 space-y-4 border-t border-slate-200/60 dark:border-slate-800/80">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-3">
                {t("jobs.wizard.compensationHintOpen")}
              </p>

              <label
                htmlFor="pay-negotiable-checkbox"
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  id="pay-negotiable-checkbox"
                  name="payNegotiable"
                  aria-label={t("jobs.wizard.payNegotiableDetail")}
                  type="checkbox"
                  checked={payNegotiable}
                  onChange={(e) => setPayNegotiable(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {t("jobs.wizard.payNegotiableDetail")}
                </span>
              </label>

              {!payNegotiable && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t("jobs.wizard.minSalary")}
                    </label>
                    <Input
                      type="text"
                      placeholder={t("jobs.wizard.placeholders.minSalary")}
                      value={minSalary}
                      onChange={(e) => {
                        setMinSalary(e.target.value);
                        if (e.target.value.trim().length > 0) {
                          setTouched((prev) => ({
                            ...prev,
                            currency: true,
                            salaryPer: true,
                          }));
                        }
                      }}
                      className="h-9 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t("jobs.wizard.maxSalary")}
                    </label>
                    <Input
                      type="text"
                      placeholder={t("jobs.wizard.placeholders.maxSalary")}
                      value={maxSalary}
                      onChange={(e) => {
                        setMaxSalary(e.target.value);
                        if (e.target.value.trim().length > 0) {
                          setTouched((prev) => ({
                            ...prev,
                            currency: true,
                            salaryPer: true,
                          }));
                        }
                      }}
                      className="h-9 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t("jobs.wizard.currency")}
                      {hasSalaryData && (
                        <span className="text-rose-500 ml-0.5">*</span>
                      )}
                    </label>
                    <CustomSelect
                      value={currency || ""}
                      onChange={(val) => {
                        setCurrency(val);
                        setTouched((prev) => ({ ...prev, currency: true }));
                      }}
                      placeholder={t("jobs.wizard.selectCurrency")}
                      options={[
                        { value: "USD", label: "USD ($)" },
                        { value: "VND", label: "VND (₫)" },
                        { value: "EUR", label: "EUR (€)" },
                        { value: "NOK", label: "NOK (kr)" },
                        { value: "GBP", label: "GBP (£)" },
                        { value: "SGD", label: "SGD (S$)" },
                      ]}
                      className="w-full"
                      triggerClassName={cn(
                        "w-full h-9 text-xs font-normal bg-white dark:bg-slate-900 rounded-xl",
                        showCurrencyError &&
                          "border-rose-500 ring-1 ring-rose-500",
                      )}
                    />
                    {showCurrencyError && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">
                        {t("jobs.wizard.currencyError")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t("jobs.wizard.perPeriod")}
                      {hasSalaryData && (
                        <span className="text-rose-500 ml-0.5">*</span>
                      )}
                    </label>
                    <CustomSelect
                      value={salaryPer || ""}
                      onChange={(val) => {
                        setSalaryPer(val);
                        setTouched((prev) => ({ ...prev, salaryPer: true }));
                      }}
                      placeholder={t("jobs.wizard.selectSalaryPer")}
                      align="right"
                      options={[
                        { value: "Year", label: t("jobs.wizard.periods.year") },
                        {
                          value: "Month",
                          label: t("jobs.wizard.periods.month"),
                        },
                        { value: "Hour", label: t("jobs.wizard.periods.hour") },
                      ]}
                      className="w-full"
                      triggerClassName={cn(
                        "w-full h-9 text-xs font-normal bg-white dark:bg-slate-900 rounded-xl",
                        showSalaryPerError &&
                          "border-rose-500 ring-1 ring-rose-500",
                      )}
                    />
                    {showSalaryPerError && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">
                        {t("jobs.wizard.salaryPerError")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
