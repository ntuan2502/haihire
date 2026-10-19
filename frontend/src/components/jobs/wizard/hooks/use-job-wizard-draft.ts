import { useState, useEffect } from "react";
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

  // Restore draft on mount if in create mode
  useEffect(() => {
    if (mode === "create" && !initialJob && typeof window !== "undefined") {
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
            if (draft.description !== undefined)
              form.setDescription(draft.description);
            if (draft.requirements !== undefined)
              form.setRequirements(draft.requirements);
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
            if (
              draft.currentStep !== undefined &&
              (draft.currentStep === 1 || draft.currentStep === 4)
            ) {
              setCurrentStep(draft.currentStep);
            }
            setHasRestoredDraft(true);
            if (draft.savedAt) {
              setDraftSavedAt(
                new Date(draft.savedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              );
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
      !form.description.trim() &&
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
          compensationOpen: form.compensationOpen,
          payNegotiable: form.payNegotiable,
          minSalary: form.minSalary,
          maxSalary: form.maxSalary,
          currency: form.currency,
          salaryPer: form.salaryPer,
          description: form.description,
          requirements: form.requirements,
          publishMode: form.publishMode,
          currentStep,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setDraftSavedAt(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
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
    form.compensationOpen,
    form.payNegotiable,
    form.minSalary,
    form.maxSalary,
    form.currency,
    form.salaryPer,
    form.description,
    form.requirements,
    form.publishMode,
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
