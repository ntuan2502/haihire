import { useState, useEffect } from "react";
import type { Job, JobType, WorkplaceType, ExperienceLevel } from "@/types";
import {
  type ScreeningQuestion,
  type ScoringCriterion,
  DEFAULT_CRITERIA,
  parseSalaryRange,
} from "../types";

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

  // Compensation state
  const initialSalary = parseSalaryRange(initialJob?.salaryRange);
  const [compensationOpen, setCompensationOpen] = useState(
    Boolean(initialJob?.salaryRange),
  );
  const [payNegotiable, setPayNegotiable] = useState(initialSalary.negotiable);
  const [minSalary, setMinSalary] = useState(initialSalary.min);
  const [maxSalary, setMaxSalary] = useState(initialSalary.max);
  const [currency, setCurrency] = useState<string | null>(
    initialSalary.currency,
  );
  const [salaryPer, setSalaryPer] = useState<string | null>(initialSalary.per);

  // Description & Requirements
  const [description, setDescription] = useState(initialJob?.description || "");
  const [requirements, setRequirements] = useState(
    initialJob?.requirements || "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // STEP 2: Application Form State
  const [phoneSetting, setPhoneSetting] = useState<
    "hidden" | "optional" | "required"
  >("optional");
  const [resumeSetting, setResumeSetting] = useState<"required" | "off">(
    "required",
  );
  const [coverLetterSetting, setCoverLetterSetting] = useState<
    "required" | "off"
  >("off");
  const [screeningQuestions, setScreeningQuestions] = useState<
    ScreeningQuestion[]
  >([]);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

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
    initialJob?.status === "PUBLISHED"
      ? "publish"
      : initialJob?.status === "CLOSED"
        ? "closed"
        : "draft",
  );

  // Synchronize state when initialJob changes
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
    setDescription("");
    setRequirements("");
    setCompensationOpen(false);
    setPayNegotiable(false);
    setMinSalary("");
    setMaxSalary("");
    setCurrency(null);
    setSalaryPer(null);
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
    formError,
    setFormError,
    saveSuccess,
    setSaveSuccess,
    phoneSetting,
    setPhoneSetting,
    resumeSetting,
    setResumeSetting,
    coverLetterSetting,
    setCoverLetterSetting,
    screeningQuestions,
    setScreeningQuestions,
    newQuestionText,
    setNewQuestionText,
    isAddingQuestion,
    setIsAddingQuestion,
    handleAddQuestion,
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
