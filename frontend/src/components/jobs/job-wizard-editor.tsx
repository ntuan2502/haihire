"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import {
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Briefcase,
  FileUp,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Zap,
  Target,
  FileText,
  Bot,
  Clipboard,
  Send,
  FileEdit,
  Share2,
  Check,
  AlertTriangle,
  Save,
  Building2,
  Clock,
  Globe2,
  DollarSign,
  UploadCloud,
  X,
} from "lucide-react";
import type { Job, JobType, JobStatus } from "@/types";

type StepId = 1 | 2 | 3 | 4;

interface ScreeningQuestion {
  id: string;
  text: string;
  type: "text" | "yes_no";
  required: boolean;
}

interface ScoringCriterion {
  id: string;
  title: string;
  category: "Experience" | "Technical" | "Soft Skills" | "Custom";
  description: string;
  weight: number;
  maxScore: number;
  key: string;
}

const DEFAULT_CRITERIA: ScoringCriterion[] = [
  {
    id: "crit_1",
    title: "Software Documentation Experience",
    category: "Experience",
    description:
      "Minimum of 2 years experience creating technical documentation for software products, including setup guides and troubleshooting playbooks.",
    weight: 90,
    maxScore: 10,
    key: "technical_writing_experience",
  },
  {
    id: "crit_2",
    title: "Developer Facing Content Proficiency",
    category: "Technical",
    description:
      "Demonstrated ability to document APIs, migrations, and operations-focused content for a technical audience.",
    weight: 80,
    maxScore: 10,
    key: "api_and_dev_content",
  },
  {
    id: "crit_3",
    title: "Markdown and Docs-as-Code Workflow",
    category: "Technical",
    description:
      "Proficiency in using Markdown and version control systems (e.g., Git) within a docs-as-code documentation lifecycle.",
    weight: 70,
    maxScore: 10,
    key: "docs_as_code_workflow",
  },
  {
    id: "crit_4",
    title: "Clarity and Information Architecture",
    category: "Soft Skills",
    description:
      "Evidence of translating complex technical systems into simple, actionable language for both admins and end-users.",
    weight: 60,
    maxScore: 10,
    key: "complex_system_simplification",
  },
  {
    id: "crit_5",
    title: "Recruiting Software Familiarity",
    category: "Custom",
    description:
      "Prior experience or familiarity with hiring/recruiting software terminology and workflows.",
    weight: 30,
    maxScore: 10,
    key: "domain_knowledge_recruiting",
  },
  {
    id: "crit_6",
    title: "Open-Source Documentation",
    category: "Custom",
    description:
      "History of contributing to open-source documentation projects or public-facing community docs.",
    weight: 20,
    maxScore: 10,
    key: "open_source_contributions",
  },
];

interface JobWizardEditorProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
}

export function JobWizardEditor({ mode, initialJob }: JobWizardEditorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const createJobMutation = useCreateJobMutation();
  const updateJobMutation = useUpdateJobMutation();
  const deleteJobMutation = useDeleteJobMutation();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  // STEP 1: Job Details State
  const [jobTitle, setJobTitle] = useState(initialJob?.title || "");
  const [department, setDepartment] = useState(initialJob?.department || "General");
  const [location, setLocation] = useState(initialJob?.location || "");
  const [postalCode, setPostalCode] = useState(initialJob?.postalCode || "");
  const [employmentType, setEmploymentType] = useState(
    initialJob?.type === "PART_TIME"
      ? "Part-time"
      : initialJob?.type === "CONTRACT"
        ? "Contract"
        : initialJob?.type === "INTERNSHIP"
          ? "Internship"
          : "Full-time",
  );
  const [experienceLevel, setExperienceLevel] = useState(
    initialJob?.experienceLevel || "Mid-level",
  );
  const [workplace, setWorkplace] = useState(
    initialJob?.workplace || (initialJob?.location?.toLowerCase().includes("remote") ? "Remote" : "Not specified"),
  );

  // Compensation state
  const [compensationOpen, setCompensationOpen] = useState(!!initialJob?.salaryRange);
  const [payNegotiable, setPayNegotiable] = useState(
    !!initialJob?.salaryRange?.toLowerCase().includes("negotiable"),
  );
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [salaryPer, setSalaryPer] = useState("Year");

  // Description & Requirements
  const [description, setDescription] = useState(initialJob?.description || "");
  const [requirements, setRequirements] = useState(initialJob?.requirements || "");
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
  const [listOnExternalBoards, setListOnExternalBoards] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const steps = [
    { id: 1 as StepId, label: "Job details", implemented: true },
    { id: 2 as StepId, label: "Application form", implemented: false },
    { id: 3 as StepId, label: "AI scoring criteria", implemented: false },
    { id: 4 as StepId, label: mode === "create" ? "Publish & distribute" : "Publish & status", implemented: true },
  ];

  // Populate from initialJob if provided or changes
  useEffect(() => {
    if (initialJob) {
      setJobTitle(initialJob.title || "");
      setDepartment(initialJob.department || "General");
      setLocation(initialJob.location || "");
      setPostalCode(initialJob.postalCode || "");
      setExperienceLevel(initialJob.experienceLevel || "Mid-level");
      setWorkplace(
        initialJob.workplace ||
          (initialJob.location?.toLowerCase().includes("remote")
            ? "Remote"
            : "Not specified"),
      );
      setDescription(initialJob.description || "");
      setRequirements(initialJob.requirements || "");

      const typeMap: Record<JobType, string> = {
        FULL_TIME: "Full-time",
        PART_TIME: "Part-time",
        CONTRACT: "Contract",
        INTERNSHIP: "Internship",
        REMOTE: "Full-time",
      };
      if (initialJob.type) {
        setEmploymentType(typeMap[initialJob.type] || "Full-time");
      }

      if (initialJob.status === "PUBLISHED") {
        setPublishMode("publish");
      } else if (initialJob.status === "CLOSED") {
        setPublishMode("closed");
      } else {
        setPublishMode("draft");
      }

      if (initialJob.salaryRange) {
        setCompensationOpen(true);
        if (initialJob.salaryRange.toLowerCase().includes("negotiable")) {
          setPayNegotiable(true);
        } else {
          const parts = initialJob.salaryRange.split("-");
          if (parts.length >= 2) {
            setMinSalary(parts[0].replace(/[^0-9]/g, "").trim());
            setMaxSalary(parts[1].replace(/[^0-9]/g, "").trim());
          }
        }
      }
    }
  }, [initialJob]);

  // Step 1 Validation & Touched state
  const [touched, setTouched] = useState({
    title: false,
    location: false,
    description: false,
  });

  const isTitleValid = jobTitle.trim().length > 0;
  const isLocationValid = location.trim().length > 0;
  const isDescriptionValid = description.trim().length > 0;
  const isStep1Valid = isTitleValid && isLocationValid && isDescriptionValid;

  const showTitleError = touched.title && !isTitleValid;
  const showLocationError = touched.location && !isLocationValid;
  const showDescriptionError = touched.description && !isDescriptionValid;

  // Advance from Step 1 to Step 4 (since steps 2 & 3 are disabled)
  const handleStep1Continue = () => {
    if (!isStep1Valid) {
      setTouched({ title: true, location: true, description: true });
      return;
    }
    setFormError(null);
    setCurrentStep(4);
  };

  const handleStepClick = (stepId: StepId) => {
    const targetStep = steps.find((s) => s.id === stepId);
    if (!targetStep?.implemented) return;
    if (currentStep === 1 && !isStep1Valid) {
      setTouched({ title: true, location: true, description: true });
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

  // AI draft questions generator
  const handleGenerateAIQuestions = () => {
    const aiQuestions: ScreeningQuestion[] = [
      {
        id: (Date.now() + 1).toString(),
        text: `How many years of relevant experience do you have for this ${jobTitle || "role"}?`,
        type: "text",
        required: true,
      },
      {
        id: (Date.now() + 2).toString(),
        text: "Are you legally authorized to work in the specified location?",
        type: "yes_no",
        required: true,
      },
    ];
    setScreeningQuestions((prev) => [...prev, ...aiQuestions]);
  };

  const handleRemoveQuestion = (id: string) => {
    setScreeningQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Step 3: Add Criterion
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
      salaryRange = `${currency} ${minSalary || "0"} - ${maxSalary || "0"} / ${salaryPer.toLowerCase()}`;
    }

    const typeMapped: JobType =
      employmentType === "Part-time"
        ? "PART_TIME"
        : employmentType === "Contract"
          ? "CONTRACT"
          : employmentType === "Internship"
            ? "INTERNSHIP"
            : "FULL_TIME";

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
          experienceLevel: experienceLevel || undefined,
          workplace: workplace || undefined,
          type: typeMapped,
          description:
            description ||
            "We are seeking a talented professional to join our team.",
          requirements: requirements || undefined,
          salaryRange: salaryRange || undefined,
          status: statusMapped,
          organizationId: user?.organizationId ?? null,
        });

        if (typeof window !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(
            `${window.location.origin}/dashboard/jobs`,
          );
          setCopiedLink(true);
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
            experienceLevel: experienceLevel || null,
            workplace: workplace || null,
            type: typeMapped,
            description:
              description ||
              "We are seeking a talented professional to join our team.",
            requirements: requirements || null,
            salaryRange: salaryRange || null,
            status: statusMapped,
          },
        });

        if (typeof window !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(
            `${window.location.origin}/dashboard/jobs/${initialJob.id}/pipeline`,
          );
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2500);
        }

        setSaveSuccess("Job settings updated successfully.");
        setTimeout(() => setSaveSuccess(null), 3500);
      }
    } catch (err) {
      console.error("Failed to save job opening:", err);
      setFormError("Failed to save job opening. Please try again.");
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
      setFormError("Failed to delete job. Please try again.");
    }
  };

  const isSaving =
    mode === "create"
      ? createJobMutation.isPending
      : updateJobMutation.isPending;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200 overflow-y-auto">
      {/* Sub-Header: Step Navigation & Controls */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 shadow-2xs shrink-0">
        <div className="mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl">
          {/* Left: Back Link & Stepper */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {mode === "create" ? (
              <Link
                href="/dashboard/jobs"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Jobs</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`)
                }
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Pipeline</span>
              </button>
            )}

            {/* Stepper Wizard Bar */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {steps.map((step) => {
                const isActive = step.id === currentStep;
                const isPassed = step.id < currentStep;
                const isImplemented = step.implemented;

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isImplemented}
                    onClick={() => handleStepClick(step.id)}
                    title={
                      !isImplemented
                        ? `${step.label} (Coming soon)`
                        : undefined
                    }
                    className={`flex items-center gap-2 text-xs transition-all ${
                      !isImplemented
                        ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600"
                        : isActive
                          ? "font-bold text-slate-900 dark:text-white cursor-pointer"
                          : isPassed
                            ? "font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                            : "font-normal text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        !isImplemented
                          ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                          : isActive
                            ? "bg-blue-600 text-white"
                            : isPassed
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        step.id
                      )}
                    </span>
                    <span>{step.label}</span>
                    {!isImplemented && (
                      <span className="text-[10px] text-slate-400 font-normal">(Coming soon)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Preview & Save Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Candidate preview</span>
            </button>
            <Button
              type="button"
              onClick={handleSaveJob}
              disabled={isSaving || (currentStep === 1 && !isStep1Valid)}
              className={cn(
                "h-8 px-3.5 text-xs font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all",
                !isSaving && (currentStep !== 1 || isStep1Valid)
                  ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  : "bg-blue-600/50 cursor-not-allowed opacity-60"
              )}
            >
              {mode === "create" ? (
                <span>{isSaving ? "Saving..." : "Save & publish"}</span>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving ? "Saving..." : "Save changes"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
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

        {/* ================= STEPS 1 & 2: FORM EDITOR ================= */}
        {(currentStep === 1 || currentStep === 2) && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-6">
              {/* TAB 1: JOB DETAILS */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      Job details
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Title, location and description are what job boards need to accept this role. Everything else is optional — and you can{" "}
                      <span className="underline decoration-slate-300 dark:decoration-slate-700 cursor-pointer">
                        save changes
                      </span>{" "}
                      at any point.
                    </p>
                  </div>

                  <div className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    {/* Field 1: Job Title */}
                    {/* Field 1 & 1.5: Job Title & Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-8">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Job title <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. Senior Frontend Engineer"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          onBlur={() =>
                            setTouched((prev) => ({ ...prev, title: true }))
                          }
                          className={cn(
                            "h-10 text-xs bg-slate-50/50 dark:bg-slate-950 transition-colors",
                            showTitleError && "border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                          )}
                          required
                        />
                        {showTitleError && (
                          <p className="text-[11px] text-rose-500 font-medium mt-1">
                            Title is required
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Department (Phòng ban)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. Engineering, Design..."
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Hiển thị ở tag phía trên Job title
                        </p>
                      </div>
                    </div>

                    {/* Field 2 & 3: Location & Postal Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-8">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Location <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="Search for a city or country..."
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onBlur={() =>
                              setTouched((prev) => ({ ...prev, location: true }))
                            }
                            className={cn(
                              "h-10 pl-9 text-xs bg-slate-50/50 dark:bg-slate-950 transition-colors",
                              showLocationError && "border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                            )}
                            required
                          />
                        </div>
                        {showLocationError ? (
                          <p className="text-[11px] text-rose-500 font-medium mt-1">
                            Add a country so job boards can place this role in their search results.
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Boards place listings by country. For a role with no base, set Workplace to Remote instead.
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Postal code <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. 0150"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Pick a location first.
                        </p>
                      </div>
                    </div>

                    {/* Field 4, 5, 6: Employment type, Experience level, Workplace */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Employment type
                        </label>
                        <Select
                          value={employmentType}
                          onValueChange={(val) => val && setEmploymentType(val)}
                        >
                          <SelectTrigger className="w-full h-10 text-xs bg-slate-50/50 dark:bg-slate-950">
                            <SelectValue placeholder="Full-time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full-time" className="text-xs">
                              Full-time
                            </SelectItem>
                            <SelectItem value="Part-time" className="text-xs">
                              Part-time
                            </SelectItem>
                            <SelectItem value="Contract" className="text-xs">
                              Contract
                            </SelectItem>
                            <SelectItem value="Internship" className="text-xs">
                              Internship
                            </SelectItem>
                            <SelectItem value="Temporary" className="text-xs">
                              Temporary
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Experience level
                        </label>
                        <Select
                          value={experienceLevel}
                          onValueChange={(val) => val && setExperienceLevel(val)}
                        >
                          <SelectTrigger className="w-full h-10 text-xs bg-slate-50/50 dark:bg-slate-950">
                            <SelectValue placeholder="Mid-level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Entry-level" className="text-xs">
                              Entry-level
                            </SelectItem>
                            <SelectItem value="Mid-level" className="text-xs">
                              Mid-level
                            </SelectItem>
                            <SelectItem value="Senior-level" className="text-xs">
                              Senior-level
                            </SelectItem>
                            <SelectItem value="Lead" className="text-xs">
                              Lead
                            </SelectItem>
                            <SelectItem value="Executive" className="text-xs">
                              Executive
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Workplace
                        </label>
                        <Select
                          value={workplace}
                          onValueChange={(val) => val && setWorkplace(val)}
                        >
                          <SelectTrigger className="w-full h-10 text-xs bg-slate-50/50 dark:bg-slate-950">
                            <SelectValue placeholder="Not specified" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not specified" className="text-xs">
                              Not specified
                            </SelectItem>
                            <SelectItem value="On-site" className="text-xs">
                              On-site
                            </SelectItem>
                            <SelectItem value="Hybrid" className="text-xs">
                              Hybrid
                            </SelectItem>
                            <SelectItem value="Remote" className="text-xs">
                              Remote
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Field 7: Compensation Accordion Card */}
                    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 transition-all overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCompensationOpen(!compensationOpen)}
                        className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {compensationOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          )}
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Compensation
                          </span>
                          <span className="rounded-md bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            Optional
                          </span>
                        </div>
                      </button>

                      {!compensationOpen ? (
                        <div className="px-4 pb-4 pt-0 text-[11px] text-slate-500 dark:text-slate-400">
                          Not stated — roles that state pay rank higher on Google Jobs and most aggregators.
                        </div>
                      ) : (
                        <div className="px-4 pb-5 pt-0 space-y-4 border-t border-slate-200/60 dark:border-slate-800/80">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-3">
                            Roles that state pay get a rich result on Google Jobs and are sorted higher by most aggregators. You can change this later in job settings.
                          </p>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={payNegotiable}
                              onChange={(e) => setPayNegotiable(e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              Pay is negotiable — show &quot;Negotiable&quot; instead of a range
                            </span>
                          </label>

                          {!payNegotiable && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Minimum
                                </label>
                                <Input
                                  type="text"
                                  placeholder="e.g. 500,000"
                                  value={minSalary}
                                  onChange={(e) => setMinSalary(e.target.value)}
                                  className="h-9 text-xs bg-white dark:bg-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Maximum
                                </label>
                                <Input
                                  type="text"
                                  placeholder="e.g. 650,000"
                                  value={maxSalary}
                                  onChange={(e) => setMaxSalary(e.target.value)}
                                  className="h-9 text-xs bg-white dark:bg-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Currency
                                </label>
                                <Select
                                  value={currency}
                                  onValueChange={(val) => val && setCurrency(val)}
                                >
                                  <SelectTrigger className="w-full h-9 text-xs bg-white dark:bg-slate-900">
                                    <SelectValue placeholder="USD" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD" className="text-xs">
                                      USD ($)
                                    </SelectItem>
                                    <SelectItem value="VND" className="text-xs">
                                      VND (₫)
                                    </SelectItem>
                                    <SelectItem value="EUR" className="text-xs">
                                      EUR (€)
                                    </SelectItem>
                                    <SelectItem value="NOK" className="text-xs">
                                      NOK (kr)
                                    </SelectItem>
                                    <SelectItem value="GBP" className="text-xs">
                                      GBP (£)
                                    </SelectItem>
                                    <SelectItem value="SGD" className="text-xs">
                                      SGD (S$)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Per
                                </label>
                                <Select
                                  value={salaryPer}
                                  onValueChange={(val) => val && setSalaryPer(val)}
                                >
                                  <SelectTrigger className="w-full h-9 text-xs bg-white dark:bg-slate-900">
                                    <SelectValue placeholder="Year" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Year" className="text-xs">
                                      Year
                                    </SelectItem>
                                    <SelectItem value="Month" className="text-xs">
                                      Month
                                    </SelectItem>
                                    <SelectItem value="Hour" className="text-xs">
                                      Hour
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Field 8: Description */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Description <span className="text-rose-500">*</span>
                      </label>
                      <Textarea
                        placeholder="Describe the role, responsibilities, and requirements..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() =>
                          setTouched((prev) => ({ ...prev, description: true }))
                        }
                        className={cn(
                          "h-40 text-xs bg-slate-50/50 dark:bg-slate-950 resize-none overflow-y-auto transition-colors",
                          showDescriptionError && "border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                        )}
                        required
                      />
                      <div className="flex items-center justify-between text-[11px] mt-1">
                        {showDescriptionError ? (
                          <span className="text-rose-500 font-medium">
                            Please provide a job description.
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            A clear description improves AI scoring and attracts better candidates.
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
                          {description.trim().length > 0 ? `${description.trim().length} chars` : "Required"}
                        </span>
                      </div>
                    </div>

                    {/* Field 9: Requirements */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Requirements (Yêu cầu ứng viên)
                      </label>
                      <Textarea
                        placeholder="Nêu các kỹ năng, kinh nghiệm chuyên môn, chứng chỉ hoặc tiêu chuẩn cần thiết cho vị trí này..."
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        className="h-32 text-xs bg-slate-50/50 dark:bg-slate-950 resize-none overflow-y-auto transition-colors"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Phần này sẽ hiển thị dưới mục &quot;Yêu cầu ứng viên (Requirements)&quot; trên trang tuyển dụng công khai.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Step 1 Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        mode === "create"
                          ? router.push("/dashboard/jobs")
                          : router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`)
                      }
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={handleStep1Continue}
                      disabled={!isStep1Valid}
                      className={cn(
                        "text-white text-xs font-bold px-6 py-2 rounded-xl shadow-xs transition-all",
                        isStep1Valid
                          ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                          : "bg-blue-600/50 cursor-not-allowed opacity-60"
                      )}
                    >
                      Save & continue
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: APPLICATION FORM */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      CUSTOMIZE YOUR APPLICATION FORM
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Edit the form on the left and watch the candidate&apos;s view update live. Locked fields are always collected and cannot be turned off.
                    </p>
                  </div>

                  {/* Section 1: Personal Information */}
                  <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Personal information
                    </h3>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <span>First name</span>
                          <Lock className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          Mandatory
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <span>Last name</span>
                          <Lock className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          Mandatory
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <span>Email</span>
                          <Lock className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          Mandatory
                        </span>
                      </div>

                      {/* Phone Field Configuration */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Phone
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Choose whether candidates see this field.
                          </p>
                        </div>

                        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setPhoneSetting("hidden")}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              phoneSetting === "hidden"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Hidden
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhoneSetting("optional")}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              phoneSetting === "optional"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Optional
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhoneSetting("required")}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              phoneSetting === "required"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Required
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Documents */}
                  <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Documents
                    </h3>

                    <div className="space-y-3">
                      {/* Resume / CV Setting */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <FileUp className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Resume / CV
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              PDF, DOC, or DOCX up to 10 MB
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setResumeSetting("required")}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              resumeSetting === "required"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Required
                          </button>
                          <button
                            type="button"
                            onClick={() => setResumeSetting("off")}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              resumeSetting === "off"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Off
                          </button>
                        </div>
                      </div>

                      {/* Cover Letter Setting */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Cover letter
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Free text field, max 10,000 characters
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setCoverLetterSetting("required")}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              coverLetterSetting === "required"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Required
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverLetterSetting("off")}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              coverLetterSetting === "off"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Off
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Screening Questions */}
                  <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Screening questions
                      </h3>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateAIQuestions}
                          className="h-8 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100/60 gap-1.5"
                        >
                          <Bot className="h-3.5 w-3.5" />
                          Generate with AI
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddingQuestion(true)}
                          className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 gap-1.5"
                        >
                          <Clipboard className="h-3.5 w-3.5" />
                          Paste existing
                        </Button>
                      </div>
                    </div>

                    {/* AI Info Callout Box */}
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          AI can draft questions from the job description.
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Safety filters are designed to exclude protected or sensitive traits. Laws vary by jurisdiction, so review every draft before publishing.
                        </p>
                      </div>
                    </div>

                    {/* Questions List or Empty State */}
                    {screeningQuestions.length === 0 && !isAddingQuestion ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No screening questions added yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {screeningQuestions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 gap-3"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="text-xs font-bold text-slate-400 shrink-0 mt-0.5">
                                {idx + 1}.
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {q.text}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  {q.type === "yes_no"
                                    ? "Yes / No Question"
                                    : "Free text answer"}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(q.id)}
                              className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                              title="Delete question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Question Inline Input Form */}
                    {isAddingQuestion && (
                      <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                        <Input
                          type="text"
                          placeholder="Enter your custom screening question..."
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          className="h-9 text-xs bg-white dark:bg-slate-900"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingQuestion(false);
                              setNewQuestionText("");
                            }}
                            className="h-8 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddQuestion}
                            disabled={!newQuestionText.trim()}
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Add Question
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* + Add a question button */}
                    {!isAddingQuestion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingQuestion(true)}
                        className="h-9 text-xs font-bold text-slate-800 dark:text-slate-200 gap-1.5 w-full sm:w-auto"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        Add a question
                      </Button>
                    )}

                    {/* Automation & Scoring Hints */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <Zap className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          Build custom automation and knockout rules from these questions — e.g. auto reject a wrong answer — anytime from the role&apos;s Automation Rules tab.
                        </span>
                      </div>

                      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <Target className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>
                          Scoring criteria written from your job description — review them in step 3.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Step 2 Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        mode === "create"
                          ? router.push("/dashboard/jobs")
                          : router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`)
                      }
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    >
                      Cancel
                    </Button>

                    <div className="flex items-center gap-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-xs cursor-pointer"
                      >
                        Save & continue
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 3: AI SCORING CRITERIA ================= */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Candidate scoring
                </h1>
                <span className="rounded-md bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  {mode === "create" ? "Optional" : "Configured"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                Every applicant is ranked against the criteria below. They&apos;re written from your job description, so read them over and change anything that doesn&apos;t fit.
              </p>
            </div>

            {/* Sub-bar: Back & Configured Badge */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to form options</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3 w-3" />
                  Written by AI from your description
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {criteria.length} criteria configured
                </span>
              </div>
            </div>

            {/* Criteria Cards List */}
            <div className="space-y-3.5">
              {criteria.map((crit) => (
                <div
                  key={crit.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {crit.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          crit.category === "Experience"
                            ? "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                            : crit.category === "Technical"
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                              : crit.category === "Soft Skills"
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {crit.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(crit.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                      title="Delete criterion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {crit.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Weight</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {crit.weight}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={crit.weight}
                        onChange={(e) =>
                          handleUpdateWeight(crit.id, Number(e.target.value))
                        }
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <span>Max score: {crit.maxScore}</span>
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">
                      Key: {crit.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Criterion Inline Form */}
            {isAddingCriterion ? (
              <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Add Custom Scoring Criterion
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Criterion Title
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Leadership and Team Mentorship"
                      value={newCriterionTitle}
                      onChange={(e) => setNewCriterionTitle(e.target.value)}
                      className="h-9 text-xs bg-white dark:bg-slate-900"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <Select
                      value={newCriterionCategory}
                      onValueChange={(val) =>
                        val &&
                        setNewCriterionCategory(
                          val as
                            | "Experience"
                            | "Technical"
                            | "Soft Skills"
                            | "Custom",
                        )
                      }
                    >
                      <SelectTrigger className="w-full h-9 text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Custom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Experience" className="text-xs">
                          Experience
                        </SelectItem>
                        <SelectItem value="Technical" className="text-xs">
                          Technical
                        </SelectItem>
                        <SelectItem value="Soft Skills" className="text-xs">
                          Soft Skills
                        </SelectItem>
                        <SelectItem value="Custom" className="text-xs">
                          Custom
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Evaluation Description
                  </label>
                  <Textarea
                    placeholder="Describe how candidates should be evaluated against this criterion..."
                    value={newCriterionDesc}
                    onChange={(e) => setNewCriterionDesc(e.target.value)}
                    rows={2}
                    className="text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingCriterion(false);
                      setNewCriterionTitle("");
                      setNewCriterionDesc("");
                    }}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCriterion}
                    disabled={!newCriterionTitle.trim()}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Criterion
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingCriterion(true)}
                className="h-10 text-xs font-bold text-slate-800 dark:text-slate-200 gap-1.5 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Add criterion
              </Button>
            )}

            {/* Automatically Score Card */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScoreApplicants}
                  onChange={(e) => setAutoScoreApplicants(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Automatically score every new applicant
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    When a candidate applies, AI will automatically analyze their resume against these criteria and assign a score.
                  </p>
                </div>
              </label>
            </div>

            {/* Bottom Step 3 Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  mode === "create"
                    ? router.push("/dashboard/jobs")
                    : router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`)
                }
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Back
                </Button>
                {mode === "create" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  >
                    Skip for now
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-xs cursor-pointer"
                >
                  Save & continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PUBLISH & DISTRIBUTE (FULL WIDTH CENTERED CARD) ================= */}
        {currentStep === 4 && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {mode === "create" ? "Ready to go?" : "Publishing & distribution"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {mode === "create"
                  ? "Publish your job to start receiving applications. After publishing, you'll be able to create tracked links."
                  : `Control the live status and visibility of "${jobTitle}".`}
              </p>
            </div>

            {/* Selection Cards */}
            <div className={`grid grid-cols-1 ${mode === "edit" ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
              {/* Card 1: Publish Now */}
              <div
                onClick={() => setPublishMode("publish")}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs space-y-3 ${
                  publishMode === "publish"
                    ? "border-blue-600 bg-white dark:bg-slate-900 ring-2 ring-blue-600/10"
                    : "border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Send className="h-4 w-4" />
                  </div>
                  {publishMode === "publish" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {mode === "create" ? "Publish now" : "Open / Published"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Live job posting. Candidates can apply and submissions are recorded.
                  </p>
                </div>
              </div>

              {/* Card 2: Save as draft */}
              <div
                onClick={() => setPublishMode("draft")}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs space-y-3 ${
                  publishMode === "draft"
                    ? "border-blue-600 bg-white dark:bg-slate-900 ring-2 ring-blue-600/10"
                    : "border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <FileEdit className="h-4 w-4" />
                  </div>
                  {publishMode === "draft" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Save as draft
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Internal preview only. Hidden from candidates and public boards.
                  </p>
                </div>
              </div>

              {/* Card 3: Closed (Edit mode only) */}
              {mode === "edit" && (
                <div
                  onClick={() => setPublishMode("closed")}
                  className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs space-y-3 ${
                    publishMode === "closed"
                      ? "border-blue-600 bg-white dark:bg-slate-900 ring-2 ring-blue-600/10"
                      : "border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    {publishMode === "closed" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Closed
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      No longer accepting new applications. Existing applicants remain.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* External Job Boards Card */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={listOnExternalBoards}
                  onChange={(e) => setListOnExternalBoards(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Also list on external job boards
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Free syndication to Jooble, Adzuna, Careerjet, Talent.com and others.
                  </p>
                </div>
              </label>
            </div>

            {/* Job Summary Card */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Job summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <Briefcase className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Title</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {jobTitle.trim() || "Untitled Job"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Location</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {location.trim() || "Remote"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <FileUp className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Resume</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {resumeSetting === "required" ? "Required" : "Off"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <Target className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Questions</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {screeningQuestions.length} custom questions
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* After Publishing Callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white mt-0.5">
                <Share2 className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {mode === "create" ? "After publishing" : "Job Workspace Link"}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {mode === "create"
                    ? "You'll get tracked links for LinkedIn, Indeed, and other platforms so you can see exactly where your applicants come from."
                    : `Direct pipeline link: ${typeof window !== "undefined" && initialJob ? `${window.location.origin}/dashboard/jobs/${initialJob.id}/pipeline` : `/dashboard/jobs/${initialJob?.id}/pipeline`}`}
                </p>
              </div>
            </div>

            {/* Danger Zone (Edit mode only) */}
            {mode === "edit" && initialJob && (
              <div className="rounded-2xl border border-rose-200/90 bg-white p-6 shadow-xs dark:border-rose-900/60 dark:bg-slate-900 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Danger Zone</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Irreversible actions related to this job opening.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-rose-100 dark:border-rose-950">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Permanently delete this job opening
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Once deleted, all candidate applications associated with this job will be permanently removed.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteJobMutation.isPending}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="h-9 px-4 text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    <span>{deleteJobMutation.isPending ? "Deleting..." : "Delete Job"}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Bottom Step 4 Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  mode === "create"
                    ? router.push("/dashboard/jobs")
                    : router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`)
                }
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveJob}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    "Saving..."
                  ) : mode === "create" ? (
                    publishMode === "publish" ? (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        {copiedLink ? "Link copied!" : "Publish & copy link"}
                      </>
                    ) : (
                      <>
                        <FileEdit className="h-3.5 w-3.5" />
                        Save as draft
                      </>
                    )
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      {copiedLink ? "Saved & Link Copied!" : "Save & Update Job"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && initialJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Delete Job Opening
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Are you sure you want to delete &quot;{jobTitle}&quot;?
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                This action is permanent and cannot be undone. All application data for this job will be wiped.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleteJobMutation.isPending}
                  className="h-9 px-4 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteJob}
                  disabled={deleteJobMutation.isPending}
                  className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
                >
                  {deleteJobMutation.isPending ? "Deleting..." : "Yes, Delete Job"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= CANDIDATE PREVIEW MODAL ================= */}
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-6xl bg-slate-100 dark:bg-slate-950 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Modal Top Bar */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Candidate Preview</span>
                      <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        Live Preview
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 hidden sm:block">
                      Trang hiển thị nội dung tuyển dụng và mẫu đơn mà ứng viên sẽ thấy
                    </p>
                  </div>
                </div>

                {/* Center: Device Switcher (Desktop / Tablet / Mobile) */}
                <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === "desktop"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDevice("tablet")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === "tablet"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <Tablet className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Tablet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === "mobile"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                {/* Right: Close Button */}
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng xem trước"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body: Scrollable Canvas with responsive width container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/90 dark:bg-slate-950/80">
                <div
                  className={cn(
                    "mx-auto transition-all duration-200 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8",
                    previewDevice === "desktop" && "max-w-5xl",
                    previewDevice === "tablet" && "max-w-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md",
                    previewDevice === "mobile" && "max-w-sm border-2 border-slate-300 dark:border-slate-700 shadow-lg px-4 py-6"
                  )}
                >
                  {/* Top Branding / Department Tag (No Navbar, pure content) */}
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      <span>{department || "Tuyển dụng"}</span>
                    </div>

                    {/* Job Title */}
                    <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {jobTitle.trim() || "Tiêu đề công việc sẽ hiển thị ở đây"}
                    </h1>

                    {/* Meta Badges Grid */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        <span>{location || "Toàn quốc"}{postalCode ? ` (${postalCode})` : ""}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{employmentType}</span>
                      </div>

                      {workplace && workplace !== "Not specified" && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                          <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{workplace}</span>
                        </div>
                      )}

                      {(payNegotiable || minSalary || maxSalary) && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                          <span>
                            {payNegotiable
                              ? "Thỏa thuận"
                              : `${currency} ${minSalary || "0"} - ${maxSalary || "0"} / ${salaryPer.toLowerCase()}`}
                          </span>
                        </div>
                      )}

                      {experienceLevel && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/70 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-semibold shadow-2xs">
                          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                          <span>{experienceLevel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-200/80 dark:border-slate-800" />

                  {/* Two-Column or Stack Layout based on device preview */}
                  <div
                    className={cn(
                      "grid gap-8 items-start",
                      previewDevice === "desktop" ? "grid-cols-12" : "grid-cols-1"
                    )}
                  >
                    {/* Left Column in Preview: JD & Requirements */}
                    <div
                      className={cn(
                        "space-y-6",
                        previewDevice === "desktop" ? "col-span-7" : "col-span-1"
                      )}
                    >
                      {/* Job Description */}
                      <div className="space-y-3">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                          Mô tả công việc (Job Description)
                        </h2>
                        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line space-y-2 font-normal">
                          {description.trim() || "Chưa nhập mô tả công việc."}
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="space-y-3 pt-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-indigo-600" />
                          Yêu cầu ứng viên (Requirements)
                        </h2>
                        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line space-y-2 font-normal">
                          {requirements.trim() || "Chưa nhập yêu cầu ứng viên."}
                        </div>
                      </div>

                      {/* Assurance Card */}
                      <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
                        <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                          <p className="font-bold text-slate-800 dark:text-white">Quy trình tuyển dụng minh bạch</p>
                          <p className="leading-relaxed text-[11px]">
                            Hồ sơ của bạn được bảo mật an toàn. Đội ngũ nhân sự sẽ phản hồi trạng thái hồ sơ trực tiếp qua email của bạn.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column in Preview: Application Form Simulation */}
                    <div
                      className={cn(
                        previewDevice === "desktop" ? "col-span-5 sticky top-4" : "col-span-1"
                      )}
                    >
                      <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-xs space-y-4">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Nộp đơn ứng tuyển
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Điền thông tin và đính kèm CV để ứng tuyển vào vị trí này.
                          </p>
                        </div>

                        <div className="space-y-3.5">
                          {/* Họ và tên đệm / Tên */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Họ và tên đệm <span className="text-rose-500">*</span>
                              </label>
                              <Input
                                type="text"
                                placeholder="Ví dụ: Nguyễn Văn"
                                disabled
                                className="h-8 text-xs cursor-not-allowed opacity-80"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Tên <span className="text-rose-500">*</span>
                              </label>
                              <Input
                                type="text"
                                placeholder="Ví dụ: An"
                                disabled
                                className="h-8 text-xs cursor-not-allowed opacity-80"
                              />
                            </div>
                          </div>

                          {/* Email */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Địa chỉ Email <span className="text-rose-500">*</span>
                            </label>
                            <Input
                              type="email"
                              placeholder="nguyenvana@example.com"
                              disabled
                              className="h-8 text-xs cursor-not-allowed opacity-80"
                            />
                          </div>

                          {/* Phone */}
                          {phoneSetting !== "hidden" && (
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Số điện thoại {phoneSetting === "required" ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Tùy chọn)</span>}
                              </label>
                              <Input
                                type="tel"
                                placeholder="0912 345 678"
                                disabled
                                className="h-8 text-xs cursor-not-allowed opacity-80"
                              />
                            </div>
                          )}

                          {/* Cover Letter / Notes */}
                          {coverLetterSetting === "required" && (
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Lời nhắn / Giới thiệu bản thân <span className="text-rose-500">*</span>
                              </label>
                              <Textarea
                                placeholder="Giới thiệu ngắn về kinh nghiệm hoặc lý do bạn phù hợp..."
                                disabled
                                rows={2}
                                className="text-xs cursor-not-allowed opacity-80 resize-none"
                              />
                            </div>
                          )}

                          {/* Screening Questions Preview */}
                          {screeningQuestions.length > 0 && (
                            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                              <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                                Câu hỏi sàng lọc (Screening Questions)
                              </h4>
                              {screeningQuestions.map((q) => (
                                <div key={q.id} className="space-y-1">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {q.text} {q.required && <span className="text-rose-500">*</span>}
                                  </label>
                                  {q.type === "yes_no" ? (
                                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                                      <label className="flex items-center gap-1.5">
                                        <input type="radio" disabled name={`q_${q.id}`} className="h-3 w-3" />
                                        <span>Có (Yes)</span>
                                      </label>
                                      <label className="flex items-center gap-1.5">
                                        <input type="radio" disabled name={`q_${q.id}`} className="h-3 w-3" />
                                        <span>Không (No)</span>
                                      </label>
                                    </div>
                                  ) : (
                                    <Input
                                      type="text"
                                      placeholder="Câu trả lời của bạn..."
                                      disabled
                                      className="h-8 text-xs cursor-not-allowed opacity-80"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Resume / CV Upload Box */}
                          {resumeSetting === "required" && (
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Hồ sơ đính kèm (CV) <span className="text-rose-500">*</span>
                              </label>
                              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl p-4 text-center cursor-not-allowed opacity-90">
                                <UploadCloud className="h-7 w-7 text-blue-500 mx-auto mb-1.5" />
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  Kéo thả file CV vào đây hoặc <span className="text-blue-600 dark:text-blue-400 underline">chọn từ thiết bị</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Định dạng hỗ trợ: PDF, DOC, DOCX (Tối đa 10MB)
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Submit Button */}
                          <Button
                            type="button"
                            disabled
                            className="w-full h-10 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs cursor-not-allowed opacity-90 mt-2"
                          >
                            Nộp hồ sơ ứng tuyển
                          </Button>

                          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                            <span>Thông tin của bạn được bảo mật tuyệt đối</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
