"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
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
import { useCreateJobMutation } from "@/hooks/use-queries";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Monitor,
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
} from "lucide-react";

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

function CreateJobPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const createJobMutation = useCreateJobMutation();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );

  // STEP 1: Job Details State
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [experienceLevel, setExperienceLevel] = useState("Mid-level");
  const [workplace, setWorkplace] = useState("Not specified");

  // Compensation state
  const [compensationOpen, setCompensationOpen] = useState(false);
  const [payNegotiable, setPayNegotiable] = useState(false);
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [salaryPer, setSalaryPer] = useState("Year");

  // Description
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
  const [publishMode, setPublishMode] = useState<"publish" | "draft">("publish");
  const [listOnExternalBoards, setListOnExternalBoards] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const steps = [
    { id: 1 as StepId, label: "Job details" },
    { id: 2 as StepId, label: "Application form" },
    { id: 3 as StepId, label: "AI scoring criteria" },
    { id: 4 as StepId, label: "Publish & distribute" },
  ];

  // Advance from Step 1 to Step 2
  const handleStep1Continue = () => {
    if (!jobTitle.trim()) {
      setFormError("Please enter a job title.");
      return;
    }
    if (!location.trim()) {
      setFormError("Please specify a job location.");
      return;
    }
    if (!description.trim()) {
      setFormError("Please provide a job description.");
      return;
    }
    setFormError(null);
    setCurrentStep(2);
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

  // Final submit / Save job
  const handlePublishJob = async () => {
    let salaryRange = "";
    if (payNegotiable) {
      salaryRange = "Negotiable";
    } else if (minSalary || maxSalary) {
      salaryRange = `${currency} ${minSalary || "0"} - ${maxSalary || "0"} / ${salaryPer.toLowerCase()}`;
    }

    try {
      await createJobMutation.mutateAsync({
        title: jobTitle || "Senior Full-Stack Engineer",
        department: "General",
        location: workplace === "Remote" ? "Remote" : location || "Remote",
        type:
          employmentType === "Part-time"
            ? "PART_TIME"
            : employmentType === "Contract"
              ? "CONTRACT"
              : employmentType === "Internship"
                ? "INTERNSHIP"
                : "FULL_TIME",
        description:
          description ||
          "We are seeking a talented professional to join our team.",
        salaryRange: salaryRange || undefined,
        status: publishMode === "publish" ? "PUBLISHED" : "DRAFT",
        organizationId: user?.organizationId ?? null,
      });

      if (typeof window !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(
          `${window.location.origin}/dashboard/jobs`,
        );
        setCopiedLink(true);
      }

      router.push("/dashboard/jobs");
    } catch (err) {
      console.error("Failed to save job opening:", err);
      setFormError("Failed to save job opening. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Sub-Header: Step Navigation & Controls */}
      <header className="sticky top-14 z-20 border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3">
        <div className="mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl">
          {/* Left: Back Link & Stepper */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Jobs</span>
            </Link>

            {/* Stepper Wizard Bar */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {steps.map((step) => {
                const isActive = step.id === currentStep;
                const isPassed = step.id < currentStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2 text-xs transition-all cursor-pointer ${
                      isActive
                        ? "font-bold text-slate-900 dark:text-white"
                        : isPassed
                          ? "font-medium text-slate-600 dark:text-slate-300"
                          : "font-normal text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        isActive
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Preview & Draft Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span>View preview</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/jobs")}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              Save & edit
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {formError && (
          <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            {formError}
          </div>
        )}

        {/* ================= STEPS 1 & 2: SPLIT SCREEN WITH LIVE PREVIEW ================= */}
        {(currentStep === 1 || currentStep === 2) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: FORM EDITOR */}
            <div className="lg:col-span-7 space-y-6">
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
                        save an incomplete draft
                      </span>{" "}
                      at any point.
                    </p>
                  </div>

                  <div className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    {/* Field 1: Job Title */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Job title <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Senior Frontend Engineer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950"
                        required
                      />
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
                            className="h-10 pl-9 text-xs bg-slate-50/50 dark:bg-slate-950"
                            required
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Boards place listings by country. For a role with no base, set Workplace to Remote instead.
                        </p>
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
                          <SelectTrigger className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950">
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
                          <SelectTrigger className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950">
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
                          <SelectTrigger className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950">
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
                                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
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
                                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
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
                        rows={8}
                        className="text-xs bg-slate-50/50 dark:bg-slate-950 resize-y"
                        required
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span>
                          A clear description improves AI scoring and attracts better candidates.
                        </span>
                        <span
                          className={
                            description.length < 50
                              ? "text-slate-400"
                              : "text-emerald-600 font-semibold"
                          }
                        >
                          {description.length} / 200
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Step 1 Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.push("/dashboard/jobs")}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={handleStep1Continue}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-xs cursor-pointer"
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
                      onClick={() => router.push("/dashboard/jobs")}
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

            {/* RIGHT COLUMN: LIVE CANDIDATE PREVIEW */}
            <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-3">
              {/* Preview Toolbar */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  LIVE CANDIDATE PREVIEW
                </span>

                <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === "desktop"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === "mobile"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Mobile
                  </button>
                </div>
              </div>

              {/* Candidate View Container */}
              <div
                className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6 transition-all ${
                  previewDevice === "mobile"
                    ? "max-w-sm mx-auto border-2 border-slate-300 dark:border-slate-700"
                    : ""
                }`}
              >
                {/* Header Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Briefcase className="h-3 w-3 text-slate-500" />
                    {employmentType}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-3 w-3 text-slate-500" />
                    {experienceLevel}
                  </span>
                  {location && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {location}
                    </span>
                  )}
                </div>

                {/* Dynamic Job Title */}
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                    {jobTitle.trim() || "Untitled Job"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap leading-relaxed">
                    {description.trim() || "No job description provided yet."}
                  </p>
                </div>

                {/* Application Form Sub-Card */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Your application
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Fields marked with <span className="text-rose-500">*</span> are required.
                    </p>
                  </div>

                  {/* First Name / Last Name (Always mandatory) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Jane"
                        disabled
                        className="h-8 text-xs bg-white dark:bg-slate-900 cursor-not-allowed opacity-80"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Last Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Doe"
                        disabled
                        className="h-8 text-xs bg-white dark:bg-slate-900 cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>

                  {/* Email (Always mandatory) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      disabled
                      className="h-8 text-xs bg-white dark:bg-slate-900 cursor-not-allowed opacity-80"
                    />
                  </div>

                  {/* Phone Field (Dynamic based on phoneSetting) */}
                  {phoneSetting !== "hidden" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phone {phoneSetting === "required" ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(optional)</span>}
                      </label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        disabled
                        className="h-8 text-xs bg-white dark:bg-slate-900 cursor-not-allowed opacity-80"
                      />
                    </div>
                  )}

                  {/* Resume / CV Field (Dynamic based on resumeSetting) */}
                  {resumeSetting === "required" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Resume / CV <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <FileUp className="h-4 w-4 text-slate-400" />
                          <span className="text-[11px]">PDF, DOC, or DOCX — max 10 MB</span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                          Choose file
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cover Letter Field (Dynamic based on coverLetterSetting) */}
                  {coverLetterSetting === "required" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cover letter <span className="text-rose-500">*</span>
                      </label>
                      <Textarea
                        placeholder="Write your cover letter here..."
                        disabled
                        rows={3}
                        className="text-xs bg-white dark:bg-slate-900 cursor-not-allowed opacity-80"
                      />
                    </div>
                  )}

                  {/* Screening Questions Preview */}
                  {screeningQuestions.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        Screening Questions
                      </h4>
                      {screeningQuestions.map((q) => (
                        <div key={q.id} className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {q.text} {q.required && <span className="text-rose-500">*</span>}
                          </label>
                          {q.type === "yes_no" ? (
                            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                              <label className="flex items-center gap-1.5">
                                <input type="radio" disabled name={`q_${q.id}`} className="h-3 w-3" />
                                <span>Yes</span>
                              </label>
                              <label className="flex items-center gap-1.5">
                                <input type="radio" disabled name={`q_${q.id}`} className="h-3 w-3" />
                                <span>No</span>
                              </label>
                            </div>
                          ) : (
                            <Input
                              type="text"
                              placeholder="Your answer..."
                              disabled
                              className="h-8 text-xs bg-white dark:bg-slate-900 cursor-not-allowed opacity-80"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit button & Privacy info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <Button
                      type="button"
                      disabled
                      className="bg-blue-600/80 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-90 cursor-not-allowed"
                    >
                      Submit Application
                    </Button>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <ShieldCheck className="h-3 w-3 text-slate-400" />
                      Your information is kept confidential.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: AI SCORING CRITERIA (FULL WIDTH CENTERED CARD) ================= */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Candidate scoring
                </h1>
                <span className="rounded-md bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  Optional
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                This step is optional — you can <span className="font-semibold text-slate-700 dark:text-slate-300">skip it and set up scoring later from job settings</span>. Every applicant is ranked against the criteria below. They&apos;re written from your job description, so read them over and change anything that doesn&apos;t fit.
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
                <span>Back to options</span>
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
                  {/* Top Row: Title, Category Badge, Delete Button */}
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

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {crit.description}
                  </p>

                  {/* Weight Slider */}
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

                  {/* Bottom Meta info: Max score & Key */}
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
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
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
                    When a candidate applies, AI will automatically analyze their resume against these criteria and assign a score. Requires an AI provider configured in settings plus a resume upload.
                  </p>
                </div>
              </label>
            </div>

            {/* Bottom Step 3 Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/jobs")}
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
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Skip for now
                </Button>
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
                Ready to go?
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Publish your job to start receiving applications. After publishing, you&apos;ll be able to create tracked links for each platform where you share it.
              </p>
            </div>

            {/* 2 Big Selection Cards: Publish now vs Save as draft */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Publish now
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Your job goes live immediately. The application link will be copied to your clipboard so you can share it right away.
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
                    Save for later review. The job won&apos;t be visible to candidates until you publish it.
                  </p>
                </div>
              </div>
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
                    Free syndication to Jooble, Adzuna, Careerjet, Talent.com and others. Turn it off for a confidential or internal only search — the role still gets its application link and its place on your career page.
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
                      {location.trim() || "Vietnam / Remote"}
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
                  After publishing
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  You&apos;ll get tracked links for LinkedIn, Indeed, and other platforms so you can see exactly where your applicants come from.
                </p>
              </div>
            </div>

            {/* Bottom Step 4 Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/jobs")}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handlePublishJob}
                  disabled={createJobMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                >
                  {createJobMutation.isPending ? (
                    "Publishing..."
                  ) : publishMode === "publish" ? (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      {copiedLink ? "Link copied!" : "Publish & copy link"}
                    </>
                  ) : (
                    <>
                      <FileEdit className="h-3.5 w-3.5" />
                      Save as draft
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CreateJobPage() {
  return (
    <AuthGuard>
      <CreateJobPageContent />
    </AuthGuard>
  );
}
