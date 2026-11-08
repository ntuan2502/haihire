"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { JobType, WorkplaceType, ExperienceLevel } from "@/types";
import {
  type StepId,
  type JobWizardEditorProps,
  WizardHeader,
  WizardStepDetails,
  WizardStepForm,
  WizardStepScoring,
  WizardStepPublish,
  WizardPreviewModal,
  WizardDeleteModal,
} from "./";
import { WizardDraftBanner } from "./components/wizard-draft-banner";
import { WizardMobileFooter } from "./components/wizard-mobile-footer";
import { useJobWizardFormState } from "./hooks/use-job-wizard-form-state";
import { useJobWizardValidation } from "./hooks/use-job-wizard-validation";
import { useJobWizardDraft } from "./hooks/use-job-wizard-draft";
import { useJobWizardSubmit } from "./hooks/use-job-wizard-submit";

export function JobWizardEditor({ mode, initialJob }: JobWizardEditorProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  const form = useJobWizardFormState(initialJob);

  const validation = useJobWizardValidation({
    jobTitle: form.jobTitle,
    location: form.location,
    description: form.description,
    employmentType: form.employmentType,
    experienceLevel: form.experienceLevel,
    workplace: form.workplace,
    payNegotiable: form.payNegotiable,
    minSalary: form.minSalary,
    maxSalary: form.maxSalary,
    currency: form.currency,
    salaryPer: form.salaryPer,
  });

  const draft = useJobWizardDraft({
    mode,
    initialJob,
    currentStep,
    setCurrentStep,
    form,
  });

  const submit = useJobWizardSubmit({
    mode,
    initialJob,
    form,
    validation,
    clearStorageDraft: draft.clearStorageDraft,
    setCurrentStep,
  });

  const steps = [
    {
      id: 1 as StepId,
      label: t("jobs.wizard.steps.details"),
      implemented: true,
    },
    {
      id: 2 as StepId,
      label: t("jobs.wizard.steps.applicationForm"),
      implemented: false,
    },
    {
      id: 3 as StepId,
      label: t("jobs.wizard.steps.aiScoring"),
      implemented: false,
    },
    {
      id: 4 as StepId,
      label:
        mode === "create"
          ? t("jobs.wizard.steps.publishDistribute")
          : t("jobs.wizard.steps.publishStatus"),
      implemented: true,
    },
  ];

  const handleStepClick = (stepId: StepId) => {
    const targetStep = steps.find((s) => s.id === stepId);
    if (!targetStep?.implemented) return;
    if (currentStep === 1 && !validation.isStep1Valid) {
      validation.touchAllStep1();
      return;
    }
    setCurrentStep(stepId);
  };

  const handleStep1Continue = () => {
    if (!validation.isStep1Valid) {
      validation.touchAllStep1();
      return;
    }
    form.setFormError(null);
    setCurrentStep(4);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200 overflow-y-auto">
      <WizardHeader
        mode={mode}
        initialJob={initialJob}
        currentStep={currentStep}
        steps={steps}
        draftSavedAt={draft.draftSavedAt}
        isSaving={submit.isSaving}
        isStep1Valid={validation.isStep1Valid}
        onStepClick={handleStepClick}
        onOpenPreview={() => setIsPreviewModalOpen(true)}
        onSaveJob={submit.handleSaveJob}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 sm:pb-20">
        {mode === "create" &&
          draft.hasRestoredDraft &&
          !draft.draftBannerDismissed && (
            <WizardDraftBanner
              draftSavedAt={draft.draftSavedAt}
              onDiscard={draft.handleDiscardDraft}
              onDismiss={() => draft.setDraftBannerDismissed(true)}
            />
          )}

        {form.formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{form.formError}</span>
          </div>
        )}

        {form.saveSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{form.saveSuccess}</span>
          </div>
        )}

        {currentStep === 1 && (
          <div className="max-w-4xl mx-auto">
            <WizardStepDetails
              jobTitle={form.jobTitle}
              setJobTitle={form.setJobTitle}
              department={form.department}
              setDepartment={form.setDepartment}
              location={form.location}
              setLocation={form.setLocation}
              postalCode={form.postalCode}
              setPostalCode={form.setPostalCode}
              employmentType={form.employmentType}
              setEmploymentType={form.setEmploymentType}
              experienceLevel={form.experienceLevel}
              setExperienceLevel={form.setExperienceLevel}
              workplace={form.workplace}
              setWorkplace={form.setWorkplace}
              compensationOpen={form.compensationOpen}
              setCompensationOpen={form.setCompensationOpen}
              payNegotiable={form.payNegotiable}
              setPayNegotiable={form.setPayNegotiable}
              minSalary={form.minSalary}
              setMinSalary={form.setMinSalary}
              maxSalary={form.maxSalary}
              setMaxSalary={form.setMaxSalary}
              currency={form.currency || ""}
              setCurrency={form.setCurrency}
              salaryPer={form.salaryPer || ""}
              setSalaryPer={form.setSalaryPer}
              description={form.description}
              setDescription={form.setDescription}
              requirements={form.requirements}
              setRequirements={form.setRequirements}
              touched={validation.touched}
              setTouched={validation.setTouched}
              showTitleError={validation.showTitleError}
              showLocationError={validation.showLocationError}
              showEmploymentTypeError={validation.showEmploymentTypeError}
              showExperienceLevelError={validation.showExperienceLevelError}
              showWorkplaceError={validation.showWorkplaceError}
              hasSalaryData={validation.hasSalaryData}
              showCurrencyError={validation.showCurrencyError}
              showSalaryPerError={validation.showSalaryPerError}
              showDescriptionError={validation.showDescriptionError}
              isDescriptionValid={validation.isDescriptionValid}
              isStep1Valid={validation.isStep1Valid}
              onContinue={handleStep1Continue}
              onCancel={submit.handleCancel}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto">
            <WizardStepForm
              phoneSetting={form.phoneSetting}
              setPhoneSetting={form.setPhoneSetting}
              resumeSetting={form.resumeSetting}
              setResumeSetting={form.setResumeSetting}
              coverLetterSetting={form.coverLetterSetting}
              setCoverLetterSetting={form.setCoverLetterSetting}
              screeningQuestions={form.screeningQuestions}
              isAddingQuestion={form.isAddingQuestion}
              setIsAddingQuestion={form.setIsAddingQuestion}
              newQuestionText={form.newQuestionText}
              setNewQuestionText={form.setNewQuestionText}
              onAddQuestion={form.handleAddQuestion}
              onRemoveQuestion={form.handleRemoveQuestion}
              onCancel={submit.handleCancel}
              onBack={() => setCurrentStep(1)}
              onContinue={() => setCurrentStep(3)}
            />
          </div>
        )}

        {currentStep === 3 && (
          <WizardStepScoring
            mode={mode}
            criteria={form.criteria}
            autoScoreApplicants={form.autoScoreApplicants}
            setAutoScoreApplicants={form.setAutoScoreApplicants}
            isAddingCriterion={form.isAddingCriterion}
            setIsAddingCriterion={form.setIsAddingCriterion}
            newCriterionTitle={form.newCriterionTitle}
            setNewCriterionTitle={form.setNewCriterionTitle}
            newCriterionDesc={form.newCriterionDesc}
            setNewCriterionDesc={form.setNewCriterionDesc}
            newCriterionCategory={form.newCriterionCategory}
            setNewCriterionCategory={form.setNewCriterionCategory}
            onUpdateWeight={form.handleUpdateWeight}
            onRemoveCriterion={form.handleRemoveCriterion}
            onAddCriterion={form.handleAddCriterion}
            onCancel={submit.handleCancel}
            onBack={() => setCurrentStep(2)}
            onSkip={() => setCurrentStep(4)}
            onContinue={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <WizardStepPublish
            mode={mode}
            initialJob={initialJob}
            publishMode={form.publishMode}
            setPublishMode={form.setPublishMode}
            jobTitle={form.jobTitle}
            location={form.location}
            resumeSetting={form.resumeSetting}
            screeningQuestionsCount={form.screeningQuestions.length}
            isSaving={submit.isSaving}
            onOpenDeleteConfirm={() => setDeleteConfirmOpen(true)}
            onCancel={submit.handleCancel}
            onBack={() => setCurrentStep(1)}
            onSaveJob={submit.handleSaveJob}
          />
        )}

        <WizardDeleteModal
          isOpen={Boolean(deleteConfirmOpen && initialJob)}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={submit.handleDeleteJob}
          jobTitle={form.jobTitle}
          isDeleting={submit.isDeleting}
        />

        <WizardPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          initialJob={initialJob}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
          jobTitle={form.jobTitle}
          department={form.department}
          location={form.location}
          postalCode={form.postalCode}
          employmentType={(form.employmentType as JobType) || null}
          workplace={(form.workplace as WorkplaceType) || null}
          experienceLevel={(form.experienceLevel as ExperienceLevel) || null}
          salaryRange={submit.formattedSalaryRange}
          description={form.description}
          requirements={form.requirements}
          phoneSetting={form.phoneSetting}
          resumeSetting={form.resumeSetting}
          coverLetterSetting={form.coverLetterSetting}
          screeningQuestions={form.screeningQuestions}
          orgName={user?.organization?.name}
        />
      </main>

      <WizardMobileFooter
        currentStep={currentStep}
        mode={mode}
        publishMode={form.publishMode}
        isStep1Valid={validation.isStep1Valid}
        isSaving={submit.isSaving}
        onCancel={submit.handleCancel}
        onStep1Continue={handleStep1Continue}
        onBackToStep1={() => setCurrentStep(1)}
        onSaveJob={submit.handleSaveJob}
      />
    </div>
  );
}
