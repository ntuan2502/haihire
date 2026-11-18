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
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { formatCandidateDisplayName } from "@haihire/shared";
import { useCreateApplicationMutation } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
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
    if (!resumeFile) {
      setSubmitError(t("careers.errorResume"));
      return;
    }

    try {
      const formData = new FormData();
      formData.append("jobId", job.id);
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("candidateEmail", candidateEmail.trim());

      if (candidatePhone.trim()) {
        formData.append("candidatePhone", candidatePhone.trim());
      }
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }
      formData.append("resume", resumeFile);

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

      await applyMutation.mutateAsync(formData);
      setIsSuccess(true);
    } catch (err: unknown) {
      console.error("Apply error:", err);
      const errorMsg = getApiErrorMessage(err, t, "careers.errorGeneric");
      setSubmitError(errorMsg);
    }
  };

  return (
    <div ref={formRef} className="lg:col-span-5 sticky top-24 space-y-6">
      <div className="p-6 sm:p-8 rounded-2xl bg-card text-card-foreground border border-border shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="text-[11px] font-bold text-foreground uppercase tracking-wider"
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

            {/* Email & Phone */}
            <div className="space-y-1.5">
              <label
                htmlFor="career-email"
                className="text-[11px] font-bold text-foreground uppercase tracking-wider"
              >
                {t("careers.email")} <span className="text-rose-500">*</span>
              </label>
              <Input
                id="career-email"
                type="email"
                required
                placeholder="name@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="h-10 text-xs rounded-md bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="career-phone"
                className="text-[11px] font-bold text-foreground uppercase tracking-wider"
              >
                {t("careers.phone")}
              </label>
              <Input
                id="career-phone"
                type="tel"
                placeholder="0912 345 678"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                className="h-10 text-xs rounded-md bg-background"
              />
            </div>

            {/* Resume Upload Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                {t("careers.resume")} <span className="text-rose-500">*</span>
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
                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText
                      className="h-5 w-5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                    <div className="truncate">
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
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label={t("common.delete")}
                    className="h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

            {/* Notes / Message */}
            <div className="space-y-1.5">
              <label
                htmlFor="career-notes"
                className="text-[11px] font-bold text-foreground uppercase tracking-wider"
              >
                {t("careers.notes")}
              </label>
              <textarea
                id="career-notes"
                rows={3}
                placeholder={t("careers.placeholders.notes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 text-xs rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all resize-none"
              />
            </div>

            {/* Privacy note */}
            <div className="pt-1 flex items-start gap-2 text-[10px] text-muted-foreground leading-normal">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>{t("careers.privacyNotice")}</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={applyMutation.isPending}
              className="w-full h-11 rounded-md text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer disabled:opacity-50"
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("careers.submitting")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("careers.submitApplication")}
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
