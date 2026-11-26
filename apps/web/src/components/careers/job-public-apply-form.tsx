"use client";

import {
  useState,
  useRef,
  useId,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import {
  COVER_LETTER_MAX_LENGTH,
  formatCandidateDisplayName,
  isValidDateOnlyString,
  isValidHttpUrl,
  normalizeJobApplicationFormConfig,
  type ScreeningAnswerValue,
  type ScreeningQuestion,
} from "@haihire/shared";
import { useCreateApplicationMutation } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import type { Job } from "@/types";

interface JobPublicApplyFormProps {
  job: Job;
  orgName: string;
  orgSlug: string;
  nameDisplayOrder: "LAST_FIRST" | "FIRST_LAST";
  refParam: string | null;
  formRef?: RefObject<HTMLDivElement | null>;
}

function isQuestionAnswered(
  q: ScreeningQuestion,
  value: ScreeningAnswerValue | undefined,
  file?: File | null,
): boolean {
  if (q.type === "file_upload") {
    return Boolean(file);
  }
  if (q.type === "yes_no") {
    return typeof value === "boolean";
  }
  if (q.type === "multiple_choice") {
    return Array.isArray(value) && value.length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return typeof value === "string" && value.trim().length > 0;
}

export function JobPublicApplyForm({
  job,
  orgName,
  orgSlug,
  nameDisplayOrder,
  refParam,
  formRef,
}: JobPublicApplyFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const isLastFirst = nameDisplayOrder === "LAST_FIRST";
  const applyMutation = useCreateApplicationMutation();

  const formConfig = normalizeJobApplicationFormConfig(
    job.applicationFormConfig,
  );
  const {
    phone: phoneMode,
    resume: resumeMode,
    coverLetter: coverLetterMode,
    screeningQuestions,
  } = formConfig;

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<
    Record<string, ScreeningAnswerValue>
  >({});
  const [screeningFiles, setScreeningFiles] = useState<
    Record<string, File | null>
  >({});
  const [screeningFileErrors, setScreeningFileErrors] = useState<
    Record<string, string | null>
  >({});
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file?: File) => {
    setFileError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFileError(t("careers.fileInvalidType"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError(t("careers.fileTooLarge"));
      return;
    }

    setResumeFile(file);
  };

  const validateAndSetScreeningFile = (questionId: string, file?: File) => {
    setScreeningFileErrors((prev) => ({ ...prev, [questionId]: null }));
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setScreeningFileErrors((prev) => ({
        ...prev,
        [questionId]: t("careers.fileInvalidType"),
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setScreeningFileErrors((prev) => ({
        ...prev,
        [questionId]: t("careers.fileTooLarge"),
      }));
      return;
    }

    setScreeningFiles((prev) => ({ ...prev, [questionId]: file }));
  };

  const handleToggleMultiOption = (questionId: string, option: string) => {
    setScreeningAnswers((prev) => {
      const current = Array.isArray(prev[questionId])
        ? (prev[questionId] as string[])
        : [];
      const exists = current.includes(option);
      const next = exists
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!job?.id) return;

    if (isLastFirst) {
      if (!lastName.trim()) {
        setSubmitError(t("careers.errorLastName"));
        return;
      }
      if (!firstName.trim()) {
        setSubmitError(t("careers.errorFirstName"));
        return;
      }
    } else {
      if (!firstName.trim()) {
        setSubmitError(t("careers.errorFirstName"));
        return;
      }
      if (!lastName.trim()) {
        setSubmitError(t("careers.errorLastName"));
        return;
      }
    }
    if (!candidateEmail.trim() || !candidateEmail.includes("@")) {
      setSubmitError(t("careers.errorEmail"));
      return;
    }
    if (phoneMode === "required" && !candidatePhone.trim()) {
      setSubmitError(t("careers.errorPhoneRequired"));
      return;
    }
    if (resumeMode === "required" && !resumeFile) {
      setSubmitError(t("careers.errorResume"));
      return;
    }
    if (coverLetterMode === "required" && !coverLetter.trim()) {
      setSubmitError(t("careers.errorCoverLetterRequired"));
      return;
    }
    for (const q of screeningQuestions) {
      const answerVal = screeningAnswers[q.id];
      const attachedFile = screeningFiles[q.id] ?? null;

      if (q.required && !isQuestionAnswered(q, answerVal, attachedFile)) {
        setSubmitError(
          t("careers.errorScreeningRequired", { question: q.text }),
        );
        return;
      }

      if (
        q.type === "number" &&
        typeof answerVal === "string" &&
        answerVal.trim()
      ) {
        if (!Number.isFinite(Number(answerVal.trim()))) {
          setSubmitError(t("careers.errorInvalidNumber", { question: q.text }));
          return;
        }
      }

      if (
        q.type === "date" &&
        typeof answerVal === "string" &&
        answerVal.trim()
      ) {
        if (!isValidDateOnlyString(answerVal)) {
          setSubmitError(t("careers.errorInvalidDate", { question: q.text }));
          return;
        }
      }

      if (
        q.type === "url" &&
        typeof answerVal === "string" &&
        answerVal.trim()
      ) {
        if (!isValidHttpUrl(answerVal)) {
          setSubmitError(t("careers.errorInvalidUrl", { question: q.text }));
          return;
        }
      }
    }

    try {
      const formData = new FormData();
      formData.append("jobId", job.id);
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("candidateEmail", candidateEmail.trim());

      if (phoneMode !== "hidden" && candidatePhone.trim()) {
        formData.append("candidatePhone", candidatePhone.trim());
      }
      if (coverLetterMode !== "hidden" && coverLetter.trim()) {
        formData.append("coverLetter", coverLetter.trim());
      }
      if (screeningQuestions.length > 0) {
        const payload = screeningQuestions.map((q) => {
          if (q.type === "file_upload") {
            const attached = screeningFiles[q.id];
            if (attached) {
              formData.append(`screeningFile:${q.id}`, attached);
            }
            return { questionId: q.id, answer: null };
          }
          const rawVal = screeningAnswers[q.id];
          if (q.type === "number") {
            const strVal =
              typeof rawVal === "string" ? rawVal.trim() : String(rawVal ?? "");
            return {
              questionId: q.id,
              answer:
                strVal && Number.isFinite(Number(strVal))
                  ? Number(strVal)
                  : null,
            };
          }
          return {
            questionId: q.id,
            answer: rawVal ?? null,
          };
        });
        formData.append("screeningAnswers", JSON.stringify(payload));
      }
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }
      if (resumeMode !== "hidden" && resumeFile) {
        formData.append("resume", resumeFile);
      }

      const activeRef =
        refParam ||
        (typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("haihire_sourcing_ref")
          : null);
      if (activeRef) {
        formData.append("ref", activeRef);
      }
      if (typeof document !== "undefined" && document.referrer) {
        formData.append("referrer", document.referrer);
      }
      if (typeof window !== "undefined" && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const utmMap: Array<[string, string]> = [
          ["utm_source", "utmSource"],
          ["utm_medium", "utmMedium"],
          ["utm_campaign", "utmCampaign"],
          ["utm_term", "utmTerm"],
          ["utm_content", "utmContent"],
        ];
        for (const [paramKey, fieldKey] of utmMap) {
          const val = urlParams.get(paramKey)?.trim();
          if (val) {
            formData.append(fieldKey, val);
          }
        }
      }

      await applyMutation.mutateAsync(formData);
      setIsSuccess(true);
    } catch (err: unknown) {
      console.error("Apply error:", err);
      const errorMsg = getApiErrorMessage(err, t, "careers.errorGeneric");
      setSubmitError(errorMsg);
    }
  };

  return (
    <div
      ref={formRef}
      className="lg:col-span-5 lg:sticky lg:top-24 min-w-0 space-y-6"
    >
      <div className="p-6 sm:p-8 rounded-xl bg-card text-card-foreground border border-border space-y-6">
        <div>
          <h2 className="text-lg font-medium text-foreground">
            {t("careers.submitApplication")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t("careers.applicationFormSubtitle")}
          </p>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                {t("careers.submitSuccessTitle")}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {t("careers.submitSuccessDesc", {
                  name: formatCandidateDisplayName(
                    { firstName, lastName },
                    nameDisplayOrder,
                  ),
                  jobTitle: job.title,
                  orgName,
                })}
              </p>
            </div>
            <Button
              onClick={() => router.push(`/careers/${orgSlug}`)}
              className="mt-2 h-9 rounded-md text-xs font-semibold cursor-pointer"
              variant="outline"
            >
              {t("careers.viewOtherJobs")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {submitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle
                  className="h-4 w-4 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{submitError}</span>
              </div>
            )}

            {/* Name inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(isLastFirst
                ? [
                    {
                      id: "career-lastName",
                      label: t("careers.lastName"),
                      placeholder: t("careers.placeholders.lastName"),
                      value: lastName,
                      onChange: setLastName,
                    },
                    {
                      id: "career-firstName",
                      label: t("careers.firstName"),
                      placeholder: t("careers.placeholders.firstName"),
                      value: firstName,
                      onChange: setFirstName,
                    },
                  ]
                : [
                    {
                      id: "career-firstName",
                      label: t("careers.firstName"),
                      placeholder: t("careers.placeholders.firstName"),
                      value: firstName,
                      onChange: setFirstName,
                    },
                    {
                      id: "career-lastName",
                      label: t("careers.lastName"),
                      placeholder: t("careers.placeholders.lastName"),
                      value: lastName,
                      onChange: setLastName,
                    },
                  ]
              ).map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label
                    htmlFor={field.id}
                    className="text-xs font-medium text-foreground"
                  >
                    {field.label} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id={field.id}
                    type="text"
                    required
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="h-10 text-xs rounded-md bg-background"
                  />
                </div>
              ))}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="career-email"
                className="text-xs font-medium text-foreground"
              >
                {t("careers.email")} <span className="text-rose-500">*</span>
              </label>
              <Input
                id="career-email"
                type="email"
                required
                placeholder={t("careers.placeholders.email")}
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="h-10 text-xs rounded-md bg-background"
              />
            </div>

            {/* Phone (Hidden / Optional / Required) */}
            {phoneMode !== "hidden" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="career-phone"
                  className="text-xs font-medium text-foreground"
                >
                  {phoneMode === "required" ? (
                    <>
                      {t("careers.phoneRequiredLabel")}{" "}
                      <span className="text-rose-500">*</span>
                    </>
                  ) : (
                    t("careers.phone")
                  )}
                </label>
                <Input
                  id="career-phone"
                  type="tel"
                  required={phoneMode === "required"}
                  placeholder={t("careers.placeholders.phone")}
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="h-10 text-xs rounded-md bg-background"
                />
              </div>
            )}

            {/* Resume Upload Box (Hidden / Optional / Required) */}
            {resumeMode !== "hidden" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t("careers.resume")}{" "}
                  {resumeMode === "required" ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-muted-foreground font-normal">
                      ({t("jobs.wizard.optionalOption")})
                    </span>
                  )}
                </label>

                <input
                  id={fileInputId}
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="sr-only peer"
                  aria-label={t("careers.resume")}
                />

                {resumeFile ? (
                  <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText
                        className="h-5 w-5 text-primary shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {resumeFile.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      aria-label={t("common.delete")}
                      className="h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor={fileInputId}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5 text-center cursor-pointer transition-colors bg-muted/40 space-y-2 block peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:border-primary"
                  >
                    <UploadCloud
                      className="h-6 w-6 text-muted-foreground mx-auto"
                      aria-hidden="true"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">
                        {t("careers.dropCvHere")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("careers.cvFormats")}
                      </p>
                    </div>
                  </label>
                )}

                {fileError && (
                  <p
                    role="alert"
                    aria-live="assertive"
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1"
                  >
                    {fileError}
                  </p>
                )}
              </div>
            )}

            {/* Cover Letter (Hidden / Optional / Required) */}
            {coverLetterMode !== "hidden" && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                  <label
                    htmlFor="career-cover-letter"
                    className="text-xs font-medium text-foreground"
                  >
                    {t("careers.coverLetterLabel")}{" "}
                    {coverLetterMode === "required" ? (
                      <span className="text-rose-500">*</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        ({t("jobs.wizard.optionalOption")})
                      </span>
                    )}
                  </label>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {t("careers.coverLetterCharsCount", {
                      count: coverLetter.length,
                    })}
                  </span>
                </div>
                <Textarea
                  id="career-cover-letter"
                  rows={4}
                  maxLength={COVER_LETTER_MAX_LENGTH}
                  required={coverLetterMode === "required"}
                  placeholder={t("careers.coverLetterPlaceholder")}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full p-3 text-xs rounded-md bg-background resize-y"
                />
              </div>
            )}

            {/* Screening Questions */}
            {screeningQuestions.length > 0 && (
              <div className="space-y-3.5 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-foreground">
                  {t("careers.screeningSectionTitle")}
                </h3>

                {screeningQuestions.map((q) => {
                  const val = screeningAnswers[q.id];
                  const fieldId = `career-q-${q.id}`;

                  return (
                    <div key={q.id} className="space-y-1.5">
                      <label
                        htmlFor={fieldId}
                        className="block text-xs font-medium text-foreground"
                      >
                        {q.text}{" "}
                        {q.required ? (
                          <span className="text-rose-500">*</span>
                        ) : (
                          <span className="text-muted-foreground font-normal">
                            ({t("jobs.wizard.optionalOption")})
                          </span>
                        )}
                      </label>

                      {q.type === "yes_no" ? (
                        <div className="flex items-center gap-4 text-xs text-foreground pt-0.5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={fieldId}
                              checked={val === true}
                              onChange={() =>
                                setScreeningAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: true,
                                }))
                              }
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span>{t("common.yes")}</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={fieldId}
                              checked={val === false}
                              onChange={() =>
                                setScreeningAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: false,
                                }))
                              }
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span>{t("common.no")}</span>
                          </label>
                        </div>
                      ) : q.type === "single_choice" ? (
                        <div className="space-y-1.5 pt-0.5">
                          {(q.options ?? []).map((opt) => (
                            <label
                              key={opt}
                              className="flex items-start py-1 gap-2 text-xs text-foreground cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={fieldId}
                                checked={val === opt}
                                onChange={() =>
                                  setScreeningAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: opt,
                                  }))
                                }
                                className="h-4 w-4 shrink-0 mt-0.5 accent-primary"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : q.type === "multiple_choice" ? (
                        <div className="space-y-1.5 pt-0.5">
                          {(q.options ?? []).map((opt) => {
                            const selectedList = Array.isArray(val) ? val : [];
                            return (
                              <label
                                key={opt}
                                className="flex items-start py-1 gap-2 text-xs text-foreground cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedList.includes(opt)}
                                  onChange={() =>
                                    handleToggleMultiOption(q.id, opt)
                                  }
                                  className="h-4 w-4 shrink-0 mt-0.5 accent-primary"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : q.type === "long_text" ? (
                        <Textarea
                          id={fieldId}
                          rows={3}
                          placeholder={t("jobs.wizard.answerPlaceholder")}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            setScreeningAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          className="w-full p-3 text-xs rounded-md bg-background resize-y"
                        />
                      ) : q.type === "number" ? (
                        <Input
                          id={fieldId}
                          type="number"
                          step="any"
                          placeholder={t("careers.numberAnswerPlaceholder")}
                          value={
                            typeof val === "string" || typeof val === "number"
                              ? String(val)
                              : ""
                          }
                          onChange={(e) =>
                            setScreeningAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          className="h-10 text-xs rounded-md bg-background"
                        />
                      ) : q.type === "date" ? (
                        <Input
                          id={fieldId}
                          type="date"
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            setScreeningAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          className="h-10 text-xs rounded-md bg-background"
                        />
                      ) : q.type === "url" ? (
                        <Input
                          id={fieldId}
                          type="url"
                          placeholder={t("careers.urlAnswerPlaceholder")}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            setScreeningAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          className="h-10 text-xs rounded-md bg-background"
                        />
                      ) : q.type === "file_upload" ? (
                        <div className="space-y-1.5">
                          <input
                            id={fieldId}
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              validateAndSetScreeningFile(
                                q.id,
                                e.target.files?.[0],
                              );
                            }}
                            className="sr-only"
                            aria-label={q.text}
                          />
                          {screeningFiles[q.id] ? (
                            <div className="p-3 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText
                                  className="h-4 w-4 text-primary shrink-0"
                                  aria-hidden="true"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">
                                    {screeningFiles[q.id]?.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {(
                                      (screeningFiles[q.id]?.size ?? 0) /
                                      (1024 * 1024)
                                    ).toFixed(2)}{" "}
                                    MB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setScreeningFiles((prev) => ({
                                    ...prev,
                                    [q.id]: null,
                                  }));
                                  setScreeningFileErrors((prev) => ({
                                    ...prev,
                                    [q.id]: null,
                                  }));
                                }}
                                aria-label={t("common.delete")}
                                className="h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor={fieldId}
                              className="border border-dashed border-border hover:border-primary rounded-lg p-3.5 text-center cursor-pointer transition-colors bg-muted/40 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <UploadCloud
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{t("careers.uploadScreeningPdf")}</span>
                            </label>
                          )}
                          {screeningFileErrors[q.id] && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400">
                              {screeningFileErrors[q.id]}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Input
                          id={fieldId}
                          type="text"
                          placeholder={t("jobs.wizard.answerPlaceholder")}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            setScreeningAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          className="h-10 text-xs rounded-md bg-background"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Notes / Message */}
            <div className="space-y-1.5">
              <label
                htmlFor="career-notes"
                className="text-xs font-medium text-foreground"
              >
                {t("careers.notes")}
              </label>
              <textarea
                id="career-notes"
                rows={3}
                placeholder={t("careers.placeholders.notes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 text-xs rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors resize-none"
              />
            </div>

            {/* Privacy note */}
            <div className="pt-1 flex items-start gap-2 text-xs text-muted-foreground leading-normal">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>{t("careers.privacyNotice")}</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={applyMutation.isPending}
              className="w-full h-11 rounded-lg text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer disabled:opacity-50"
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("careers.submitting")}
                </>
              ) : (
                <>{t("careers.submitApplication")}</>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
