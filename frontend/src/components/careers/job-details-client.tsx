"use client";

import {
  useState,
  useEffect,
  useRef,
  useId,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCreateApplicationMutation } from "@/hooks/use-queries";
import { sourcingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CareersHeader } from "@/components/careers/careers-header";
import { CareersFooter } from "@/components/careers/careers-footer";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { buildCandidateNotes } from "@/lib/utils";
import {
  getJobTypeLabel,
  getWorkplaceLabel,
  getExperienceLevelLabel,
} from "@/lib/jobs";
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Globe2,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import type { Job, Organization } from "@/types";

export interface JobDetailsClientProps {
  initialJob: Job;
  initialOrg?: Organization | null;
  orgSlug: string;
  jobSlug: string;
}

export function JobDetailsClient({
  initialJob: job,
  initialOrg: org,
  orgSlug,
  jobSlug: _jobSlug,
}: JobDetailsClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const applyMutation = useCreateApplicationMutation();
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");

  // Record click on public tracking link (with session deduplication)
  useEffect(() => {
    if (refParam) {
      try {
        sessionStorage.setItem("haihire_sourcing_ref", refParam);
        const clickRecordedKey = `haihire_click_recorded_${refParam}`;
        if (!sessionStorage.getItem(clickRecordedKey)) {
          sessionStorage.setItem(clickRecordedKey, "true");
          sourcingApi
            .recordPublicClick({
              token: refParam,
              referrer:
                typeof document !== "undefined" ? document.referrer : undefined,
            })
            .catch(() => {});
        }
      } catch {
        // Ignore storage errors in private browsing
      }
    }
  }, [refParam]);

  // Form states
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputId = useId();

  // Handle file drop & select
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

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFileError(t("careers.fileTooLarge"));
      return;
    }

    setResumeFile(file);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!job?.id) return;

    if (!lastName.trim()) {
      setSubmitError(t("careers.errorLastName"));
      return;
    }
    if (!firstName.trim()) {
      setSubmitError(t("careers.errorFirstName"));
      return;
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
      const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();
      const formData = new FormData();
      formData.append("jobId", job.id);
      formData.append("candidateName", fullName);
      formData.append("candidateEmail", candidateEmail.trim());

      const formattedNotes = buildCandidateNotes({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customNotes: notes.trim() || undefined,
      });

      if (candidatePhone.trim()) {
        formData.append("candidatePhone", candidatePhone.trim());
      }
      if (formattedNotes) {
        formData.append("notes", formattedNotes);
      }
      formData.append("resume", resumeFile);

      // Attach sourcing attribution (session-scoped)
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

  if (job.status !== "PUBLISHED") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("careers.jobClosed.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
          {t("careers.jobClosed.description")}
        </p>
        <Button
          onClick={() => router.push(`/careers/${orgSlug}`)}
          className="mt-6 h-9 rounded-xl text-xs font-semibold cursor-pointer"
        >
          {t("careers.jobClosed.viewOtherJobs")}
        </Button>
      </div>
    );
  }

  const orgName = org?.name || "Company";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <CareersHeader
        orgName={orgName}
        orgSlug={orgSlug}
        showShareButton={true}
        onShare={handleCopyLink}
        copiedLink={copiedLink}
        shareLabel={t("careers.share")}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Back link */}
        <div>
          <Link
            href={`/careers/${orgSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t("careers.allJobsAt", { org: orgName })}</span>
          </Link>
        </div>

        {/* Job Header Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  {job.department}
                </span>
                {job.workplace && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                    {getWorkplaceLabel(job.workplace, t)}
                  </span>
                )}
                {job.experienceLevel && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                    {getExperienceLevelLabel(job.experienceLevel, t)}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span>{orgName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{getJobTypeLabel(job.type, t)}</span>
                </div>
                {job.salaryRange && (
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-4 w-4" />
                    <span>{job.salaryRange}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Button to scroll to apply form */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  formRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-11 px-6 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                {t("careers.applyNow")}
              </Button>
            </div>
          </div>
        </div>

        {/* Content & Apply Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Job Description & Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
              {/* Job Overview */}
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  {t("careers.jobDescription")}
                </h2>
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                  {job.description}
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    {t("careers.requirements")}
                  </h2>
                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                    {job.requirements}
                  </div>
                </div>
              )}
            </div>

            {/* About Organization Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("careers.aboutCompany", { org: orgName })}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t("careers.aboutCompanyDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Apply Form */}
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
                        name: `${lastName} ${firstName}`.trim(),
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
                  {/* Alert Error */}
                  {submitError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Name inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("careers.lastName")}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder={t("careers.placeholders.lastName")}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("careers.firstName")}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder={t("careers.placeholders.firstName")}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t("careers.email")}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t("careers.phone")}
                    </label>
                    <Input
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
                      {t("careers.resume")}{" "}
                      <span className="text-rose-500">*</span>
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
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
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
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                        {fileError}
                      </p>
                    )}
                  </div>

                  {/* Notes / Message */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t("careers.notes")}
                    </label>
                    <textarea
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
        </div>
      </main>

      {/* Footer */}
      <CareersFooter orgName={orgName} orgSlug={orgSlug} />
    </div>
  );
}
