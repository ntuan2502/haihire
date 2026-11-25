import { useState, useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import {
  DEFAULT_JOB_APPLICATION_FORM_CONFIG,
  normalizeJobApplicationFormConfig,
  type ApplicationFormFieldMode,
  type Job,
  type JobType,
  type WorkplaceType,
  type ExperienceLevel,
} from "@/types";
import { getActiveDefaultCurrency } from "@/lib/utils";
import { formatDateOnlyForInput } from "@/lib/jobs";
import {
  type ScreeningQuestion,
  type ScoringCriterion,
  DEFAULT_CRITERIA,
  parseSalaryRange,
} from "../types";

function generateQuestionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `q_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useJobWizardFormState(initialJob?: Job | null) {
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

  // Schedule & Headcount
  const [scheduleOpen, setScheduleOpen] = useState(
    Boolean(
      initialJob?.applicationDeadline ||
      initialJob?.startDate ||
      (initialJob?.openings && initialJob.openings > 1),
    ),
  );
  const [applicationDeadline, setApplicationDeadline] = useState(
    formatDateOnlyForInput(initialJob?.applicationDeadline),
  );
  const [startDate, setStartDate] = useState(
    formatDateOnlyForInput(initialJob?.startDate),
  );
  const [openings, setOpenings] = useState(String(initialJob?.openings ?? 1));

  // Compensation state
  const initialSalary = parseSalaryRange(initialJob?.salaryRange);
  const [compensationOpen, setCompensationOpen] = useState(
    Boolean(initialJob?.salaryRange),
  );
  const [payNegotiable, setPayNegotiable] = useState(initialSalary.negotiable);
  const [minSalary, setMinSalary] = useState(initialSalary.min);
  const [maxSalary, setMaxSalary] = useState(initialSalary.max);
  const [currency, setCurrency] = useState<string | null>(
    initialSalary.currency ??
      initialJob?.salaryCurrency ??
      (!initialJob && !initialSalary.negotiable
        ? getActiveDefaultCurrency()
        : null),
  );
  const [salaryPer, setSalaryPer] = useState<string | null>(initialSalary.per);

  // Description
  const [description, setDescription] = useState(initialJob?.description || "");
  const [formError, setFormError] = useState<string | null>(null);

  // STEP 2: Application Form State
  const initialFormConfig = normalizeJobApplicationFormConfig(
    initialJob?.applicationFormConfig,
  );
  const [phoneSetting, setPhoneSetting] = useState<ApplicationFormFieldMode>(
    initialFormConfig.phone,
  );
  const [resumeSetting, setResumeSetting] = useState<ApplicationFormFieldMode>(
    initialFormConfig.resume,
  );
  const [coverLetterSetting, setCoverLetterSetting] =
    useState<ApplicationFormFieldMode>(initialFormConfig.coverLetter);
  const [screeningQuestions, setScreeningQuestions] = useState<
    ScreeningQuestion[]
  >(initialFormConfig.screeningQuestions);

  // STEP 3: Candidate Scoring State
  const [criteria, setCriteria] =
    useState<ScoringCriterion[]>(DEFAULT_CRITERIA);
  const [autoScoreApplicants, setAutoScoreApplicants] = useState(true);
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [newCriterionTitle, setNewCriterionTitle] = useState("");
  const [newCriterionDesc, setNewCriterionDesc] = useState("");
  const [newCriterionCategory, setNewCriterionCategory] = useState<
    "Experience" | "Technical" | "Soft Skills" | "Custom"
  >("Custom");

  // STEP 4: Publish & Distribute State
  const [publishMode, setPublishMode] = useState<
    "publish" | "draft" | "closed"
  >(
    !initialJob || initialJob.status === "PUBLISHED"
      ? "publish"
      : initialJob.status === "CLOSED"
        ? "closed"
        : "draft",
  );

  const syncedJobIdRef = useRef<string | null>(initialJob?.id ?? null);
  const syncedStatusRef = useRef<string | undefined>(initialJob?.status);

  // Synchronize state only when the edited job identity changes, avoiding wiping user edits on refetch
  useEffect(() => {
    if (!initialJob) return;

    if (initialJob.id !== syncedJobIdRef.current) {
      syncedJobIdRef.current = initialJob.id;
      syncedStatusRef.current = initialJob.status;
      setJobTitle(initialJob.title || "");
      setDepartment(initialJob.department || "");
      setLocation(initialJob.location || "");
      setPostalCode(initialJob.postalCode || "");
      setEmploymentType((initialJob.type as JobType) || "");
      setExperienceLevel((initialJob.experienceLevel as ExperienceLevel) || "");
      setWorkplace((initialJob.workplace as WorkplaceType) || "");
      setScheduleOpen(
        Boolean(
          initialJob.applicationDeadline ||
          initialJob.startDate ||
          (initialJob.openings && initialJob.openings > 1),
        ),
      );
      setApplicationDeadline(
        formatDateOnlyForInput(initialJob.applicationDeadline),
      );
      setStartDate(formatDateOnlyForInput(initialJob.startDate));
      setOpenings(String(initialJob.openings ?? 1));
      setDescription(initialJob.description || "");

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
        setCurrency(parsed.currency ?? initialJob.salaryCurrency ?? null);
        setSalaryPer(parsed.per);
      } else {
        setCompensationOpen(false);
        setPayNegotiable(false);
        setMinSalary("");
        setMaxSalary("");
        setCurrency(null);
        setSalaryPer(null);
      }
      const nextFormConfig = normalizeJobApplicationFormConfig(
        initialJob.applicationFormConfig,
      );
      setPhoneSetting(nextFormConfig.phone);
      setResumeSetting(nextFormConfig.resume);
      setCoverLetterSetting(nextFormConfig.coverLetter);
      setScreeningQuestions(nextFormConfig.screeningQuestions);
      return;
    }

    if (initialJob.status !== syncedStatusRef.current) {
      syncedStatusRef.current = initialJob.status;
      if (initialJob.status === "PUBLISHED") {
        setPublishMode("publish");
      } else if (initialJob.status === "CLOSED") {
        setPublishMode("closed");
      } else {
        setPublishMode("draft");
      }
    }
  }, [initialJob]);

  const handleAddScreeningQuestion = (
    question: Omit<ScreeningQuestion, "id">,
  ) => {
    const trimmedText = question.text.trim();
    if (!trimmedText) return;
    const newQ: ScreeningQuestion = {
      id: generateQuestionId(),
      text: trimmedText,
      type: question.type,
      required: question.required,
      ...(question.options && question.options.length > 0
        ? { options: question.options }
        : {}),
    };
    setScreeningQuestions((prev) => [...prev, newQ].slice(0, 30));
  };

  const handleUpdateScreeningQuestion = (
    id: string,
    patch: Omit<ScreeningQuestion, "id">,
  ) => {
    const trimmedText = patch.text.trim();
    if (!trimmedText) return;
    setScreeningQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              id,
              text: trimmedText,
              type: patch.type,
              required: patch.required,
              ...(patch.options && patch.options.length > 0
                ? { options: patch.options }
                : {}),
            }
          : q,
      ),
    );
  };

  const handleBulkAddScreeningQuestions = (
    items: Array<Omit<ScreeningQuestion, "id">>,
  ) => {
    const valid = items
      .map((item) => ({
        id: generateQuestionId(),
        text: item.text.trim(),
        type: item.type,
        required: item.required,
        ...(item.options && item.options.length > 0
          ? { options: item.options }
          : {}),
      }))
      .filter((item) => item.text.length > 0);
    if (valid.length === 0) return;
    setScreeningQuestions((prev) => [...prev, ...valid].slice(0, 30));
  };

  const handleReorderScreeningQuestions = (
    activeId: string,
    overId: string,
  ) => {
    if (activeId === overId) return;
    setScreeningQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === activeId);
      const newIndex = prev.findIndex((q) => q.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleRemoveQuestion = (id: string) => {
    setScreeningQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleAddCriterion = () => {
    if (!newCriterionTitle.trim()) return;
    const newCrit: ScoringCriterion = {
      id: "crit_" + Date.now(),
      title: newCriterionTitle.trim(),
      category: newCriterionCategory,
      description:
        newCriterionDesc.trim() || "Criterion evaluation requirement.",
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

  const resetForm = () => {
    setJobTitle("");
    setDepartment("");
    setLocation("");
    setPostalCode("");
    setEmploymentType("");
    setExperienceLevel("");
    setWorkplace("");
    setScheduleOpen(false);
    setApplicationDeadline("");
    setStartDate("");
    setOpenings("1");
    setDescription("");
    setCompensationOpen(false);
    setPayNegotiable(false);
    setMinSalary("");
    setMaxSalary("");
    setCurrency(getActiveDefaultCurrency());
    setSalaryPer(null);
    setPhoneSetting(DEFAULT_JOB_APPLICATION_FORM_CONFIG.phone);
    setResumeSetting(DEFAULT_JOB_APPLICATION_FORM_CONFIG.resume);
    setCoverLetterSetting(DEFAULT_JOB_APPLICATION_FORM_CONFIG.coverLetter);
    setScreeningQuestions([]);
  };

  return {
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
    formError,
    setFormError,
    phoneSetting,
    setPhoneSetting,
    resumeSetting,
    setResumeSetting,
    coverLetterSetting,
    setCoverLetterSetting,
    screeningQuestions,
    setScreeningQuestions,
    handleAddScreeningQuestion,
    handleUpdateScreeningQuestion,
    handleBulkAddScreeningQuestions,
    handleReorderScreeningQuestions,
    handleRemoveQuestion,
    criteria,
    setCriteria,
    autoScoreApplicants,
    setAutoScoreApplicants,
    isAddingCriterion,
    setIsAddingCriterion,
    newCriterionTitle,
    setNewCriterionTitle,
    newCriterionDesc,
    setNewCriterionDesc,
    newCriterionCategory,
    setNewCriterionCategory,
    handleAddCriterion,
    handleUpdateWeight,
    handleRemoveCriterion,
    publishMode,
    setPublishMode,
    resetForm,
  };
}

export type JobWizardFormState = ReturnType<typeof useJobWizardFormState>;
