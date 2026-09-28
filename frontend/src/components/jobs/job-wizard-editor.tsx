"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import {
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Job, JobType, JobStatus, WorkplaceType, ExperienceLevel } from "@/types";
import {
  type StepId,
  type ScreeningQuestion,
  type ScoringCriterion,
  type Step1TouchedState,
  DEFAULT_CRITERIA,
  parseSalaryRange,
  WizardHeader,
  WizardStepDetails,
  WizardStepForm,
  WizardStepScoring,
  WizardStepPublish,
  WizardPreviewModal,
  WizardDeleteModal,
} from "./wizard";

interface JobWizardEditorProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
}

const DRAFT_STORAGE_KEY = "haihire_job_wizard_draft";

export function JobWizardEditor({ mode, initialJob }: JobWizardEditorProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const createJobMutation = useCreateJobMutation();
  const updateJobMutation = useUpdateJobMutation();
  const deleteJobMutation = useDeleteJobMutation();

  // Wizard navigation & modal state
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  // STEP 1: Job Details State
  const [jobTitle, setJobTitle] = useState(initialJob?.title || "");
  const [department, setDepartment] = useState(initialJob?.department || "");
  const [location, setLocation] = useState(initialJob?.location || "");
  const [postalCode, setPostalCode] = useState(initialJob?.postalCode || "");
  const [employmentType, setEmploymentType] = useState<JobType | "">(
    (initialJob?.type as JobType) || "",
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">(
    (initialJob?.experienceLevel as ExperienceLevel) || "",
  );
  const [workplace, setWorkplace] = useState<WorkplaceType | "">(
    (initialJob?.workplace as WorkplaceType) || "",
  );

  // Compensation state
  const initialSalary = parseSalaryRange(initialJob?.salaryRange);
  const [compensationOpen, setCompensationOpen] = useState(Boolean(initialJob?.salaryRange));
  const [payNegotiable, setPayNegotiable] = useState(initialSalary.negotiable);
  const [minSalary, setMinSalary] = useState(initialSalary.min);
  const [maxSalary, setMaxSalary] = useState(initialSalary.max);
  const [currency, setCurrency] = useState<string | null>(initialSalary.currency);
  const [salaryPer, setSalaryPer] = useState<string | null>(initialSalary.per);

  // Description & Requirements
  const [description, setDescription] = useState(initialJob?.description || "");
  const [requirements, setRequirements] = useState(initialJob?.requirements || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // STEP 2: Application Form State
  const [phoneSetting, setPhoneSetting] = useState<"hidden" | "optional" | "required">(
    "optional",
  );
  const [resumeSetting, setResumeSetting] = useState<"required" | "off">("required");
  const [coverLetterSetting, setCoverLetterSetting] = useState<"required" | "off">("off");
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>([]);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // STEP 3: Candidate Scoring State
  const [criteria, setCriteria] = useState<ScoringCriterion[]>(DEFAULT_CRITERIA);
  const [autoScoreApplicants, setAutoScoreApplicants] = useState(true);
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [newCriterionTitle, setNewCriterionTitle] = useState("");
  const [newCriterionDesc, setNewCriterionDesc] = useState("");
  const [newCriterionCategory, setNewCriterionCategory] = useState<
    "Experience" | "Technical" | "Soft Skills" | "Custom"
  >("Custom");

  // STEP 4: Publish & Distribute State
  const [publishMode, setPublishMode] = useState<"publish" | "draft" | "closed">(
    initialJob?.status === "PUBLISHED"
      ? "publish"
      : initialJob?.status === "CLOSED"
        ? "closed"
        : "draft",
  );

  const steps = [
    { id: 1 as StepId, label: t("jobs.wizard.steps.details"), implemented: true },
    { id: 2 as StepId, label: t("jobs.wizard.steps.applicationForm"), implemented: false },
    { id: 3 as StepId, label: t("jobs.wizard.steps.aiScoring"), implemented: false },
    {
      id: 4 as StepId,
      label:
        mode === "create"
          ? t("jobs.wizard.steps.publishDistribute")
          : t("jobs.wizard.steps.publishStatus"),
      implemented: true,
    },
  ];

  // Populate from initialJob if provided or changes
  useEffect(() => {
    if (initialJob) {
      setJobTitle(initialJob.title || "");
      setDepartment(initialJob.department || "");
      setLocation(initialJob.location || "");
      setPostalCode(initialJob.postalCode || "");
      setEmploymentType((initialJob.type as JobType) || "");
      setExperienceLevel((initialJob.experienceLevel as ExperienceLevel) || "");
      setWorkplace((initialJob.workplace as WorkplaceType) || "");
      setDescription(initialJob.description || "");
      setRequirements(initialJob.requirements || "");

      if (initialJob.status === "PUBLISHED") {
        setPublishMode("publish");
      } else if (initialJob.status === "CLOSED") {
        setPublishMode("closed");
      } else {
        setPublishMode("draft");
      }

      if (initialJob.salaryRange) {
        setCompensationOpen(true);
        const parsed = parseSalaryRange(initialJob.salaryRange);
        setPayNegotiable(parsed.negotiable);
        setMinSalary(parsed.min);
        setMaxSalary(parsed.max);
        setCurrency(parsed.currency);
        setSalaryPer(parsed.per);
      } else {
        setCompensationOpen(false);
        setPayNegotiable(false);
        setMinSalary("");
        setMaxSalary("");
        setCurrency(null);
        setSalaryPer(null);
      }
    }
  }, [initialJob]);

  // LocalStorage Draft Management (mode === "create")
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
          if (draft && (draft.jobTitle || draft.description || draft.location)) {
            if (draft.jobTitle !== undefined) setJobTitle(draft.jobTitle);
            if (draft.department !== undefined) setDepartment(draft.department);
            if (draft.location !== undefined) setLocation(draft.location);
            if (draft.postalCode !== undefined) setPostalCode(draft.postalCode);
            if (draft.employmentType !== undefined) setEmploymentType(draft.employmentType);
            if (draft.experienceLevel !== undefined) setExperienceLevel(draft.experienceLevel);
            if (draft.workplace !== undefined) setWorkplace(draft.workplace);
            if (draft.description !== undefined) setDescription(draft.description);
            if (draft.requirements !== undefined) setRequirements(draft.requirements);
            if (draft.compensationOpen !== undefined) setCompensationOpen(draft.compensationOpen);
            if (draft.payNegotiable !== undefined) setPayNegotiable(draft.payNegotiable);
            if (draft.minSalary !== undefined) setMinSalary(draft.minSalary);
            if (draft.maxSalary !== undefined) setMaxSalary(draft.maxSalary);
            if (draft.currency !== undefined) setCurrency(draft.currency);
            if (draft.salaryPer !== undefined) setSalaryPer(draft.salaryPer);
            if (draft.publishMode !== undefined) setPublishMode(draft.publishMode);
            if (draft.currentStep !== undefined && (draft.currentStep === 1 || draft.currentStep === 4)) {
              setCurrentStep(draft.currentStep);
            }
            setHasRestoredDraft(true);
            if (draft.savedAt) {
              setDraftSavedAt(
                new Date(draft.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to restore draft from localStorage:", err);
      }
    }
  }, [mode, initialJob]);

  // Debounced auto-save effect
  useEffect(() => {
    if (mode !== "create" || initialJob || typeof window === "undefined") return;
    if (!jobTitle.trim() && !description.trim() && !location.trim()) return;

    const timer = setTimeout(() => {
      try {
        const draftData = {
          jobTitle,
          department,
          location,
          postalCode,
          employmentType,
          experienceLevel,
          workplace,
          compensationOpen,
          payNegotiable,
          minSalary,
          maxSalary,
          currency,
          salaryPer,
          description,
          requirements,
          publishMode,
          currentStep,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setDraftSavedAt(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        );
      } catch (e) {
        console.error("Failed to auto-save draft:", e);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    mode,
    initialJob,
    jobTitle,
    department,
    location,
    postalCode,
    employmentType,
    experienceLevel,
    workplace,
    compensationOpen,
    payNegotiable,
    minSalary,
    maxSalary,
    currency,
    salaryPer,
    description,
    requirements,
    publishMode,
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
    setJobTitle("");
    setDepartment("");
    setLocation("");
    setPostalCode("");
    setEmploymentType("");
    setExperienceLevel("");
    setWorkplace("");
    setDescription("");
    setRequirements("");
    setCompensationOpen(false);
    setPayNegotiable(false);
    setMinSalary("");
    setMaxSalary("");
    setCurrency(null);
    setSalaryPer(null);
    setCurrentStep(1);
    setHasRestoredDraft(false);
    setDraftSavedAt(null);
  };

  // Step 1 Validation & Touched state
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
  const showEmploymentTypeError = touched.employmentType && !isEmploymentTypeValid;
  const showExperienceLevelError = touched.experienceLevel && !isExperienceLevelValid;
  const showWorkplaceError = touched.workplace && !isWorkplaceValid;
  const showCurrencyError = hasSalaryData && touched.currency && !isCurrencyValid;
  const showSalaryPerError = hasSalaryData && touched.salaryPer && !isSalaryPerValid;

  const handleStep1Continue = () => {
    if (!isStep1Valid) {
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
      return;
    }
    setFormError(null);
    setCurrentStep(4);
  };

  const handleStepClick = (stepId: StepId) => {
    const targetStep = steps.find((s) => s.id === stepId);
    if (!targetStep?.implemented) return;
    if (currentStep === 1 && !isStep1Valid) {
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
      return;
    }
    setCurrentStep(stepId);
  };

  // Add question handler
  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQ: ScreeningQuestion = {
      id: Date.now().toString(),
      text: newQuestionText.trim(),
      type: "text",
      required: true,
    };
    setScreeningQuestions((prev) => [...prev, newQ]);
    setNewQuestionText("");
    setIsAddingQuestion(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setScreeningQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Step 3: Criteria Handlers
  const handleAddCriterion = () => {
    if (!newCriterionTitle.trim()) return;
    const newCrit: ScoringCriterion = {
      id: "crit_" + Date.now(),
      title: newCriterionTitle.trim(),
      category: newCriterionCategory,
      description: newCriterionDesc.trim() || "Criterion evaluation requirement.",
      weight: 50,
      maxScore: 10,
      key: newCriterionTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 30),
    };
    setCriteria((prev) => [...prev, newCrit]);
    setNewCriterionTitle("");
    setNewCriterionDesc("");
    setIsAddingCriterion(false);
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight } : c)),
    );
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  // Save / Publish job
  const handleSaveJob = async () => {
    let salaryRange = "";
    if (payNegotiable) {
      salaryRange = "Negotiable";
    } else if (minSalary || maxSalary) {
      const cur = currency ? `${currency} ` : "";
      const per = salaryPer ? ` / ${salaryPer.toLowerCase()}` : "";
      salaryRange = `${cur}${minSalary || "0"} - ${maxSalary || "0"}${per}`.trim();
    }

    if (!isStep1Valid) {
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
      setCurrentStep(1);
      setFormError(t("jobs.fillRequiredFields"));
      return;
    }

    const typeMapped: JobType = (employmentType as JobType) || "FULL_TIME";

    const statusMapped: JobStatus =
      publishMode === "publish"
        ? "PUBLISHED"
        : publishMode === "closed"
          ? "CLOSED"
          : "DRAFT";

    try {
      setFormError(null);
      setSaveSuccess(null);

      if (mode === "create") {
        await createJobMutation.mutateAsync({
          title: jobTitle || "Senior Full-Stack Engineer",
          department: department || "General",
          location: location || "Remote",
          postalCode: postalCode || undefined,
          experienceLevel: (experienceLevel as ExperienceLevel) || undefined,
          workplace: (workplace as WorkplaceType) || undefined,
          type: typeMapped,
          description:
            description ||
            "We are seeking a talented professional to join our team.",
          requirements: requirements || undefined,
          salaryRange: salaryRange || undefined,
          status: statusMapped,
          organizationId: user?.organizationId ?? null,
        });

        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          } catch {
            // ignore
          }
        }

        router.push("/dashboard/jobs");
      } else if (mode === "edit" && initialJob) {
        await updateJobMutation.mutateAsync({
          id: initialJob.id,
          data: {
            title: jobTitle || "Senior Full-Stack Engineer",
            department: department || "General",
            location: location || "Remote",
            postalCode: postalCode || null,
            experienceLevel: (experienceLevel as ExperienceLevel) || null,
            workplace: (workplace as WorkplaceType) || null,
            type: typeMapped,
            description:
              description ||
              "We are seeking a talented professional to join our team.",
            requirements: requirements || null,
            salaryRange: salaryRange || null,
            status: statusMapped,
          },
        });

        setSaveSuccess(t("jobs.wizard.saveSuccess"));
        setTimeout(() => setSaveSuccess(null), 3500);
      }
    } catch (err) {
      console.error("Failed to save job opening:", err);
      setFormError(t("jobs.wizard.errors.saveFailed"));
    }
  };

  // Delete Job Handler (Edit mode)
  const handleDeleteJob = async () => {
    if (!initialJob) return;
    try {
      await deleteJobMutation.mutateAsync(initialJob.id);
      router.push("/dashboard/jobs");
    } catch (err) {
      console.error("Failed to delete job:", err);
      setFormError(t("jobs.wizard.errors.deleteFailed"));
    }
  };

  const isSaving =
    mode === "create"
      ? createJobMutation.isPending
      : updateJobMutation.isPending;

  const handleCancel = () => {
    if (mode === "create") {
      router.push("/dashboard/jobs");
    } else {
      router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`);
    }
  };

  let formattedSalaryRange: string | undefined;
  if (payNegotiable) {
    formattedSalaryRange = "Negotiable";
  } else if (minSalary || maxSalary) {
    const cur = currency ? `${currency} ` : "";
    const per = salaryPer ? ` / ${salaryPer.toLowerCase()}` : "";
    formattedSalaryRange = `${cur}${minSalary || "0"} - ${maxSalary || "0"}${per}`.trim();
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200 overflow-y-auto">
      {/* Sub-Header: Step Navigation & Controls */}
      <WizardHeader
        mode={mode}
        initialJob={initialJob}
        currentStep={currentStep}
        steps={steps}
        draftSavedAt={draftSavedAt}
        isSaving={isSaving}
        isStep1Valid={isStep1Valid}
        onStepClick={handleStepClick}
        onOpenPreview={() => setIsPreviewModalOpen(true)}
        onSaveJob={handleSaveJob}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 sm:pb-20">
        {/* Restored Draft Banner */}
        {mode === "create" && hasRestoredDraft && !draftBannerDismissed && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {t("jobs.wizard.draftRestored")}{draftSavedAt ? ` (${draftSavedAt})` : ""}.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                {t("jobs.wizard.discardDraft")}
              </button>
              <button
                type="button"
                onClick={() => setDraftBannerDismissed(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                {t("jobs.wizard.continueEditing")}
              </button>
            </div>
          </div>
        )}

        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* STEP 1: JOB DETAILS */}
        {currentStep === 1 && (
          <div className="max-w-4xl mx-auto">
            <WizardStepDetails
              jobTitle={jobTitle}
              setJobTitle={setJobTitle}
              department={department}
              setDepartment={setDepartment}
              location={location}
              setLocation={setLocation}
              postalCode={postalCode}
              setPostalCode={setPostalCode}
              employmentType={employmentType}
              setEmploymentType={setEmploymentType}
              experienceLevel={experienceLevel}
              setExperienceLevel={setExperienceLevel}
              workplace={workplace}
              setWorkplace={setWorkplace}
              compensationOpen={compensationOpen}
              setCompensationOpen={setCompensationOpen}
              payNegotiable={payNegotiable}
              setPayNegotiable={setPayNegotiable}
              minSalary={minSalary}
              setMinSalary={setMinSalary}
              maxSalary={maxSalary}
              setMaxSalary={setMaxSalary}
              currency={currency || ""}
              setCurrency={setCurrency}
              salaryPer={salaryPer || ""}
              setSalaryPer={setSalaryPer}
              description={description}
              setDescription={setDescription}
              requirements={requirements}
              setRequirements={setRequirements}
              touched={touched}
              setTouched={setTouched}
              showTitleError={showTitleError}
              showLocationError={showLocationError}
              showEmploymentTypeError={showEmploymentTypeError}
              showExperienceLevelError={showExperienceLevelError}
              showWorkplaceError={showWorkplaceError}
              hasSalaryData={hasSalaryData}
              showCurrencyError={showCurrencyError}
              showSalaryPerError={showSalaryPerError}
              showDescriptionError={showDescriptionError}
              isDescriptionValid={isDescriptionValid}
              isStep1Valid={isStep1Valid}
              onContinue={handleStep1Continue}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* STEP 2: APPLICATION FORM */}
        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto">
            <WizardStepForm
              phoneSetting={phoneSetting}
              setPhoneSetting={setPhoneSetting}
              resumeSetting={resumeSetting}
              setResumeSetting={setResumeSetting}
              coverLetterSetting={coverLetterSetting}
              setCoverLetterSetting={setCoverLetterSetting}
              screeningQuestions={screeningQuestions}
              isAddingQuestion={isAddingQuestion}
              setIsAddingQuestion={setIsAddingQuestion}
              newQuestionText={newQuestionText}
              setNewQuestionText={setNewQuestionText}
              onAddQuestion={handleAddQuestion}
              onRemoveQuestion={handleRemoveQuestion}
              onCancel={handleCancel}
              onBack={() => setCurrentStep(1)}
              onContinue={() => setCurrentStep(3)}
            />
          </div>
        )}

        {/* STEP 3: CANDIDATE SCORING */}
        {currentStep === 3 && (
          <WizardStepScoring
            mode={mode}
            criteria={criteria}
            autoScoreApplicants={autoScoreApplicants}
            setAutoScoreApplicants={setAutoScoreApplicants}
            isAddingCriterion={isAddingCriterion}
            setIsAddingCriterion={setIsAddingCriterion}
            newCriterionTitle={newCriterionTitle}
            setNewCriterionTitle={setNewCriterionTitle}
            newCriterionDesc={newCriterionDesc}
            setNewCriterionDesc={setNewCriterionDesc}
            newCriterionCategory={newCriterionCategory}
            setNewCriterionCategory={setNewCriterionCategory}
            onUpdateWeight={handleUpdateWeight}
            onRemoveCriterion={handleRemoveCriterion}
            onAddCriterion={handleAddCriterion}
            onCancel={handleCancel}
            onBack={() => setCurrentStep(2)}
            onSkip={() => setCurrentStep(4)}
            onContinue={() => setCurrentStep(4)}
          />
        )}

        {/* STEP 4: PUBLISH & DISTRIBUTE */}
        {currentStep === 4 && (
          <WizardStepPublish
            mode={mode}
            initialJob={initialJob}
            publishMode={publishMode}
            setPublishMode={setPublishMode}
            jobTitle={jobTitle}
            location={location}
            resumeSetting={resumeSetting}
            screeningQuestionsCount={screeningQuestions.length}
            isSaving={isSaving}
            onOpenDeleteConfirm={() => setDeleteConfirmOpen(true)}
            onCancel={handleCancel}
            onBack={() => setCurrentStep(1)}
            onSaveJob={handleSaveJob}
          />
        )}

        {/* Delete Confirmation Modal */}
        <WizardDeleteModal
          isOpen={Boolean(deleteConfirmOpen && initialJob)}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDeleteJob}
          jobTitle={jobTitle}
          isDeleting={deleteJobMutation.isPending}
        />

        {/* Candidate ATS Preview Modal */}
        <WizardPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          initialJob={initialJob}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
          jobTitle={jobTitle}
          department={department}
          location={location}
          postalCode={postalCode}
          employmentType={(employmentType as JobType) || null}
          workplace={(workplace as WorkplaceType) || null}
          experienceLevel={(experienceLevel as ExperienceLevel) || null}
          salaryRange={formattedSalaryRange}
          description={description}
          requirements={requirements}
          phoneSetting={phoneSetting}
          resumeSetting={resumeSetting}
          coverLetterSetting={coverLetterSetting}
          screeningQuestions={screeningQuestions}
          orgName={user?.organization?.name}
        />
      </main>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 shadow-lg flex items-center justify-between gap-3">
        {currentStep === 1 ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleStep1Continue}
              disabled={!isStep1Valid}
              className={cn(
                "text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all",
                isStep1Valid
                  ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  : "bg-blue-600/50 cursor-not-allowed opacity-60",
              )}
            >
              {t("jobs.wizard.continueToPublish")}
            </Button>
          </>
        ) : currentStep === 4 ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {t("jobs.wizard.backAction")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveJob}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs gap-1.5"
            >
              {isSaving
                ? t("jobs.wizard.saving")
                : mode === "create"
                  ? publishMode === "publish"
                    ? t("jobs.wizard.publishNow")
                    : t("jobs.wizard.saveDraft")
                  : t("jobs.wizard.saveChanges")}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
