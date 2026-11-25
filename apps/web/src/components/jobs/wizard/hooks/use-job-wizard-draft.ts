import { useState, useEffect, useRef } from "react";
import { extractPlainTextFromHtml } from "@haihire/shared";
import { formatTime } from "@/lib/utils";
import type { Job } from "@/types";
import type { StepId } from "../types";
import type { JobWizardFormState } from "./use-job-wizard-form-state";

export const DRAFT_STORAGE_KEY = "haihire_job_wizard_draft";

interface UseJobWizardDraftProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
  currentStep: StepId;
  setCurrentStep: (step: StepId) => void;
  form: JobWizardFormState;
}

export function useJobWizardDraft({
  mode,
  initialJob,
  currentStep,
  setCurrentStep,
  form,
}: UseJobWizardDraftProps) {
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);
  const restorationAttempted = useRef(false);

  // Restore draft on mount if in create mode
  useEffect(() => {
    if (mode === "create" && !initialJob && typeof window !== "undefined") {
      if (restorationAttempted.current) return;
      restorationAttempted.current = true;
      try {
        const savedRaw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedRaw) {
          const draft = JSON.parse(savedRaw);
          if (
            draft &&
            (draft.jobTitle || draft.description || draft.location)
          ) {
            if (draft.jobTitle !== undefined) form.setJobTitle(draft.jobTitle);
            if (draft.department !== undefined)
              form.setDepartment(draft.department);
            if (draft.location !== undefined) form.setLocation(draft.location);
            if (draft.postalCode !== undefined)
              form.setPostalCode(draft.postalCode);
            if (draft.employmentType !== undefined)
              form.setEmploymentType(draft.employmentType);
            if (draft.experienceLevel !== undefined)
              form.setExperienceLevel(draft.experienceLevel);
            if (draft.workplace !== undefined)
              form.setWorkplace(draft.workplace);
            if (draft.scheduleOpen !== undefined)
              form.setScheduleOpen(draft.scheduleOpen);
            if (draft.applicationDeadline !== undefined)
              form.setApplicationDeadline(draft.applicationDeadline);
            if (draft.startDate !== undefined)
              form.setStartDate(draft.startDate);
            if (draft.openings !== undefined) form.setOpenings(draft.openings);
            if (draft.description !== undefined || draft.requirements) {
              const mergedDescription = [
                draft.description || "",
                draft.requirements || "",
              ]
                .filter(Boolean)
                .join("\n\n");
              form.setDescription(mergedDescription);
            }
            if (draft.compensationOpen !== undefined)
              form.setCompensationOpen(draft.compensationOpen);
            if (draft.payNegotiable !== undefined)
              form.setPayNegotiable(draft.payNegotiable);
            if (draft.minSalary !== undefined)
              form.setMinSalary(draft.minSalary);
            if (draft.maxSalary !== undefined)
              form.setMaxSalary(draft.maxSalary);
            if (draft.currency !== undefined) form.setCurrency(draft.currency);
            if (draft.salaryPer !== undefined)
              form.setSalaryPer(draft.salaryPer);
            if (draft.publishMode !== undefined)
              form.setPublishMode(draft.publishMode);
            if (draft.phoneSetting !== undefined)
              form.setPhoneSetting(draft.phoneSetting);
            if (draft.resumeSetting !== undefined)
              form.setResumeSetting(draft.resumeSetting);
            if (draft.coverLetterSetting !== undefined)
              form.setCoverLetterSetting(draft.coverLetterSetting);
            if (Array.isArray(draft.screeningQuestions))
              form.setScreeningQuestions(draft.screeningQuestions);
            if (
              draft.currentStep !== undefined &&
              (draft.currentStep === 1 ||
                draft.currentStep === 2 ||
                draft.currentStep === 4)
            ) {
              setCurrentStep(draft.currentStep);
            }
            setHasRestoredDraft(true);
            if (draft.savedAt) {
              setDraftSavedAt(formatTime(new Date(draft.savedAt)));
            }
          }
        }
      } catch (err) {
        console.error("Failed to restore draft from localStorage:", err);
      }
    }
  }, [mode, initialJob, setCurrentStep, form]);

  // Debounced auto-save effect
  useEffect(() => {
    if (mode !== "create" || initialJob || typeof window === "undefined")
      return;
    if (
      !form.jobTitle.trim() &&
      !extractPlainTextFromHtml(form.description) &&
      !form.location.trim()
    )
      return;

    const timer = setTimeout(() => {
      try {
        const draftData = {
          jobTitle: form.jobTitle,
          department: form.department,
          location: form.location,
          postalCode: form.postalCode,
          employmentType: form.employmentType,
          experienceLevel: form.experienceLevel,
          workplace: form.workplace,
          scheduleOpen: form.scheduleOpen,
          applicationDeadline: form.applicationDeadline,
          startDate: form.startDate,
          openings: form.openings,
          compensationOpen: form.compensationOpen,
          payNegotiable: form.payNegotiable,
          minSalary: form.minSalary,
          maxSalary: form.maxSalary,
          currency: form.currency,
          salaryPer: form.salaryPer,
          description: form.description,
          publishMode: form.publishMode,
          phoneSetting: form.phoneSetting,
          resumeSetting: form.resumeSetting,
          coverLetterSetting: form.coverLetterSetting,
          screeningQuestions: form.screeningQuestions,
          currentStep,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setDraftSavedAt(formatTime(new Date()));
      } catch (e) {
        console.error("Failed to auto-save draft:", e);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    mode,
    initialJob,
    form.jobTitle,
    form.department,
    form.location,
    form.postalCode,
    form.employmentType,
    form.experienceLevel,
    form.workplace,
    form.scheduleOpen,
    form.applicationDeadline,
    form.startDate,
    form.openings,
    form.compensationOpen,
    form.payNegotiable,
    form.minSalary,
    form.maxSalary,
    form.currency,
    form.salaryPer,
    form.description,
    form.publishMode,
    form.phoneSetting,
    form.resumeSetting,
    form.coverLetterSetting,
    form.screeningQuestions,
    currentStep,
  ]);

  const handleDiscardDraft = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    form.resetForm();
    setCurrentStep(1);
    setHasRestoredDraft(false);
    setDraftSavedAt(null);
  };

  const clearStorageDraft = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  return {
    hasRestoredDraft,
    draftSavedAt,
    draftBannerDismissed,
    setDraftBannerDismissed,
    handleDiscardDraft,
    clearStorageDraft,
  };
}
