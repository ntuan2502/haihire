import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJobWizardDraft, DRAFT_STORAGE_KEY } from "./use-job-wizard-draft";
import { useJobWizardFormState } from "./use-job-wizard-form-state";
import type { StepId } from "../types";

describe("useJobWizardDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("restores once and preserves subsequent edits and step changes", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ jobTitle: "Saved title", currentStep: 1 }));
    const { result } = renderHook(() => {
      const form = useJobWizardFormState();
      const [currentStep, setCurrentStep] = useState<StepId>(1);
      useJobWizardDraft({ mode: "create", form, currentStep, setCurrentStep });
      return { form, currentStep, setCurrentStep };
    });
    expect(result.current.form.jobTitle).toBe("Saved title");

    act(() => {
      result.current.form.setJobTitle("Edited title");
      result.current.setCurrentStep(4);
    });
    expect(result.current.form.jobTitle).toBe("Edited title");
    expect(result.current.currentStep).toBe(4);
    act(() => vi.advanceTimersByTime(800));
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!)).toMatchObject({ jobTitle: "Edited title", currentStep: 4 });
  });
});
