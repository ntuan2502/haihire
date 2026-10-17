import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import {
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import type {
  Job,
  JobType,
  JobStatus,
  WorkplaceType,
  ExperienceLevel,
} from "@/types";
import type { StepId } from "../types";
import type { JobWizardFormState } from "./use-job-wizard-form-state";
import type { JobWizardValidation } from "./use-job-wizard-validation";

interface UseJobWizardSubmitProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
  form: JobWizardFormState;
  validation: JobWizardValidation;
  clearStorageDraft: () => void;
  setCurrentStep: (step: StepId) => void;
}

export function useJobWizardSubmit({
  mode,
  initialJob,
  form,
  validation,
  clearStorageDraft,
  setCurrentStep,
}: UseJobWizardSubmitProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const createJobMutation = useCreateJobMutation();
  const updateJobMutation = useUpdateJobMutation();
  const deleteJobMutation = useDeleteJobMutation();

  const isSaving =
    mode === "create"
      ? createJobMutation.isPending
      : updateJobMutation.isPending;

  let formattedSalaryRange: string | undefined;
  if (form.payNegotiable) {
    formattedSalaryRange = "Negotiable";
  } else if (form.minSalary || form.maxSalary) {
    const cur = form.currency ? `${form.currency} ` : "";
    const per = form.salaryPer ? ` / ${form.salaryPer.toLowerCase()}` : "";
    formattedSalaryRange =
      `${cur}${form.minSalary || "0"} - ${form.maxSalary || "0"}${per}`.trim();
  }

  const handleSaveJob = async () => {
    let salaryRange = "";
    if (form.payNegotiable) {
      salaryRange = "Negotiable";
    } else if (form.minSalary || form.maxSalary) {
      const cur = form.currency ? `${form.currency} ` : "";
      const per = form.salaryPer ? ` / ${form.salaryPer.toLowerCase()}` : "";
      salaryRange =
        `${cur}${form.minSalary || "0"} - ${form.maxSalary || "0"}${per}`.trim();
    }

    if (!validation.isStep1Valid) {
      validation.touchAllStep1();
      setCurrentStep(1);
      form.setFormError(t("jobs.fillRequiredFields"));
      return;
    }

    const typeMapped: JobType = (form.employmentType as JobType) || "FULL_TIME";

    const statusMapped: JobStatus =
      form.publishMode === "publish"
        ? "PUBLISHED"
        : form.publishMode === "closed"
          ? "CLOSED"
          : "DRAFT";

    try {
      form.setFormError(null);
      form.setSaveSuccess(null);

      if (mode === "create") {
        await createJobMutation.mutateAsync({
          title: form.jobTitle || "Senior Full-Stack Engineer",
          department: form.department || "General",
          location: form.location || "Remote",
          postalCode: form.postalCode || undefined,
          experienceLevel:
            (form.experienceLevel as ExperienceLevel) || undefined,
          workplace: (form.workplace as WorkplaceType) || undefined,
          type: typeMapped,
          description:
            form.description ||
            "We are seeking a talented professional to join our team.",
          requirements: form.requirements || undefined,
          salaryRange: salaryRange || undefined,
          status: statusMapped,
          organizationId: user?.organizationId ?? null,
        });

        clearStorageDraft();
        router.push("/dashboard/jobs");
      } else if (mode === "edit" && initialJob) {
        await updateJobMutation.mutateAsync({
          id: initialJob.id,
          data: {
            title: form.jobTitle || "Senior Full-Stack Engineer",
            department: form.department || "General",
            location: form.location || "Remote",
            postalCode: form.postalCode || null,
            experienceLevel: (form.experienceLevel as ExperienceLevel) || null,
            workplace: (form.workplace as WorkplaceType) || null,
            type: typeMapped,
            description:
              form.description ||
              "We are seeking a talented professional to join our team.",
            requirements: form.requirements || null,
            salaryRange: salaryRange || null,
            status: statusMapped,
          },
        });

        form.setSaveSuccess(t("jobs.wizard.saveSuccess"));
        setTimeout(() => form.setSaveSuccess(null), 3500);
      }
    } catch (err) {
      console.error("Failed to save job opening:", err);
      form.setFormError(t("jobs.wizard.errors.saveFailed"));
    }
  };

  const handleDeleteJob = async () => {
    if (!initialJob) return;
    try {
      await deleteJobMutation.mutateAsync(initialJob.id);
      router.push("/dashboard/jobs");
    } catch (err) {
      console.error("Failed to delete job:", err);
      form.setFormError(t("jobs.wizard.errors.deleteFailed"));
    }
  };

  const handleCancel = () => {
    if (mode === "create") {
      router.push("/dashboard/jobs");
    } else {
      router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`);
    }
  };

  return {
    isSaving,
    isDeleting: deleteJobMutation.isPending,
    formattedSalaryRange,
    handleSaveJob,
    handleDeleteJob,
    handleCancel,
  };
}
