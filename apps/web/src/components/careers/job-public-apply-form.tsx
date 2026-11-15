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
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t("careers.submitApplication")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t("careers.applicationFormSubtitle")}
          </p>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("careers.submitSuccessTitle")}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
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
              className="mt-2 h-9 rounded-xl text-xs font-semibold cursor-pointer"
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
                className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
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
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
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
                    className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60"
                  />
                </div>
              ))}
            </div>

            {/* Email & Phone */}
            <div className="space-y-1.5">
              <label
                htmlFor="career-email"
                className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
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
                className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="career-phone"
                className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                {t("careers.phone")}
              </label>
              <Input
                id="career-phone"
                type="tel"
                placeholder="0912 345 678"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60"
              />
            </div>

            {/* Resume Upload Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t("careers.resume")} <span className="text-rose-500">*</span>
              </label>

              <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="sr-only peer"
                aria-label={t("careers.resume")}
              />

              {resumeFile ? (
                <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText
                      className="h-5 w-5 text-blue-600 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {resumeFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
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
                    className="h-7 w-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor={fileInputId}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50 space-y-2 block peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                >
                  <UploadCloud
                    className="h-6 w-6 text-slate-400 mx-auto"
                    aria-hidden="true"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("careers.dropCvHere")}
                    </p>
                    <p className="text-[10px] text-slate-400">
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
                className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                {t("careers.notes")}
              </label>
              <textarea
                id="career-notes"
                rows={3}
                placeholder={t("careers.placeholders.notes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            {/* Privacy note */}
            <div className="pt-1 flex items-start gap-2 text-[10px] text-slate-400 leading-normal">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{t("careers.privacyNotice")}</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={applyMutation.isPending}
              className="w-full h-11 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
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
