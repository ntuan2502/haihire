import { useState } from "react";
import type { JobType, WorkplaceType, ExperienceLevel } from "@/types";
import type { Step1TouchedState } from "../wizard-step-details";

interface UseJobWizardValidationProps {
  jobTitle: string;
  location: string;
  description: string;
  employmentType: JobType | "";
  experienceLevel: ExperienceLevel | "";
  workplace: WorkplaceType | "";
  payNegotiable: boolean;
  minSalary: string;
  maxSalary: string;
  currency: string | null;
  salaryPer: string | null;
}

export function useJobWizardValidation({
  jobTitle,
  location,
  description,
  employmentType,
  experienceLevel,
  workplace,
  payNegotiable,
  minSalary,
  maxSalary,
  currency,
  salaryPer,
}: UseJobWizardValidationProps) {
  const [touched, setTouched] = useState<Step1TouchedState>({
    title: false,
    location: false,
    description: false,
    employmentType: false,
    experienceLevel: false,
    workplace: false,
    currency: false,
    salaryPer: false,
  });

  const isTitleValid = jobTitle.trim().length > 0;
  const isLocationValid = location.trim().length > 0;
  const isDescriptionValid = description.trim().length > 0;
  const isEmploymentTypeValid = Boolean(employmentType);
  const isExperienceLevelValid = Boolean(experienceLevel);
  const isWorkplaceValid = Boolean(workplace);

  const hasSalaryData =
    !payNegotiable &&
    (minSalary.trim().length > 0 ||
      maxSalary.trim().length > 0 ||
      currency !== null ||
      salaryPer !== null);
  const isCurrencyValid = !hasSalaryData || Boolean(currency);
  const isSalaryPerValid = !hasSalaryData || Boolean(salaryPer);

  const isStep1Valid =
    isTitleValid &&
    isLocationValid &&
    isDescriptionValid &&
    isEmploymentTypeValid &&
    isExperienceLevelValid &&
    isWorkplaceValid &&
    isCurrencyValid &&
    isSalaryPerValid;

  const showTitleError = touched.title && !isTitleValid;
  const showLocationError = touched.location && !isLocationValid;
  const showDescriptionError = touched.description && !isDescriptionValid;
  const showEmploymentTypeError =
    touched.employmentType && !isEmploymentTypeValid;
  const showExperienceLevelError =
    touched.experienceLevel && !isExperienceLevelValid;
  const showWorkplaceError = touched.workplace && !isWorkplaceValid;
  const showCurrencyError =
    hasSalaryData && touched.currency && !isCurrencyValid;
  const showSalaryPerError =
    hasSalaryData && touched.salaryPer && !isSalaryPerValid;

  const touchAllStep1 = () => {
    setTouched({
      title: true,
      location: true,
      description: true,
      employmentType: true,
      experienceLevel: true,
      workplace: true,
      currency: true,
      salaryPer: true,
    });
  };

  const resetTouched = () => {
    setTouched({
      title: false,
      location: false,
      description: false,
      employmentType: false,
      experienceLevel: false,
      workplace: false,
      currency: false,
      salaryPer: false,
    });
  };

  return {
    touched,
    setTouched,
    touchAllStep1,
    resetTouched,
    isTitleValid,
    isLocationValid,
    isDescriptionValid,
    isEmploymentTypeValid,
    isExperienceLevelValid,
    isWorkplaceValid,
    hasSalaryData,
    isCurrencyValid,
    isSalaryPerValid,
    isStep1Valid,
    showTitleError,
    showLocationError,
    showDescriptionError,
    showEmploymentTypeError,
    showExperienceLevelError,
    showWorkplaceError,
    showCurrencyError,
    showSalaryPerError,
  };
}

export type JobWizardValidation = ReturnType<typeof useJobWizardValidation>;
