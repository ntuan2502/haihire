"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import {
  useJobs,
  useAllApplications,
  useUpdateCandidateMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  parseCandidateNotes,
  buildCandidateNotes,
  normalizeDateForInput,
  isValidUuid,
} from "@/lib/utils";
import { useI18n } from "@/i18n";

function EditCandidatePageContent() {
  const params = useParams();
  const router = useRouter();
  const { user, canEdit, loading: authLoading } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (!authLoading && !canEdit) {
      router.replace("/dashboard/candidates");
    }
  }, [authLoading, canEdit, router]);

  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: applications = [], isLoading: loadingApps } = useAllApplications();
  const updateCandidateMutation = useUpdateCandidateMutation();

  // Strict UUID validation — edit candidate URL MUST be a valid UUID
  const isCandidateIdValid = isValidUuid(rawId);
  const primaryApp = isCandidateIdValid
    ? applications.find((a) => String(a.id) === String(rawId))
    : undefined;

  // Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Not specified");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Status & Validation
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form when candidate data is loaded
  useEffect(() => {
    if (primaryApp && !isInitialized) {
      const parsed = parseCandidateNotes(primaryApp.notes, primaryApp.candidateName);
      setFirstName(parsed.firstName);
      setLastName(parsed.lastName);
      setDisplayName(parsed.displayName);
      setEmail(primaryApp.candidateEmail || "");
      setPhone(primaryApp.candidatePhone || "");

      if (parsed.gender && parsed.gender !== "—") {
        setGender(parsed.gender);
      }
      if (parsed.dob && parsed.dob !== "—") {
        setDateOfBirth(normalizeDateForInput(parsed.dob));
      }
      setIsInitialized(true);
    }
  }, [primaryApp, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryApp) return;

    setErrorMsg("");

    if (!firstName.trim()) {
      setErrorMsg("First name is required.");
      return;
    }
    if (!lastName.trim()) {
      setErrorMsg("Last name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      const effectiveDisplayName = displayName.trim()
        ? displayName.trim()
        : `${firstName.trim()} ${lastName.trim()}`.trim();

      const parsedOld = parseCandidateNotes(primaryApp.notes, primaryApp.candidateName);

      const notes = buildCandidateNotes({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || undefined,
        gender,
        dob: dateOfBirth,
        customNotes: parsedOld.customNotes,
      });

      await updateCandidateMutation.mutateAsync({
        id: primaryApp.id,
        data: {
          candidateName: effectiveDisplayName,
          candidateEmail: email.trim(),
          candidatePhone: phone.trim() || undefined,
          notes: notes || undefined,
        },
      });

      // Navigate back to Candidate Detail using UUID
      router.push(`/dashboard/candidates/${primaryApp.id}`);
    } catch (err: unknown) {
      console.error("Failed to update candidate:", err);
      const maybeAxios = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        maybeAxios?.response?.data?.message ||
          t("candidates.updateFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingApps && !isInitialized && isCandidateIdValid) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => {}}
          jobsCount={jobs.length}
          candidatesCount={applications.length}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if ((!isCandidateIdValid || !primaryApp) && !loadingApps) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => {}}
          jobsCount={jobs.length}
          candidatesCount={applications.length}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-1 border border-rose-200 dark:border-rose-900 shadow-xs">
            <span className="text-lg font-black">404</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("candidates.noCandidatesFound")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {!isCandidateIdValid
              ? t("candidates.invalidCandidateId")
              : t("candidates.candidateNotFound")}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard/candidates")}
              variant="outline"
              className="text-xs font-semibold rounded-xl"
            >
              {t("common.back")}: {t("candidates.title")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        activeTab="candidates"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => {}}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content Form */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href={
              primaryApp
                ? `/dashboard/candidates/${primaryApp.id}`
                : "/dashboard/candidates"
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("common.back")}</span>
          </Link>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {t("candidates.editCandidateTitle")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("candidates.editCandidateSubtitle")}
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("candidates.firstName")} <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder={t("candidates.placeholders.firstName")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("candidates.lastName")} <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder={t("candidates.placeholders.lastName")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("candidates.email")} <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              required
              placeholder={t("candidates.placeholders.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("candidates.phone")}
            </label>
            <Input
              type="tel"
              placeholder={t("candidates.placeholders.phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("candidates.displayName")}{" "}
              <span className="text-[11px] font-normal text-slate-400">
                {t("candidates.displayNameHint")}
              </span>
            </label>
            <Input
              placeholder={t("candidates.placeholders.displayName")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* 2 Columns: Gender & Date of Birth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("candidates.gender")}
              </label>
              <Select value={gender} onValueChange={(val) => val && setGender(val)}>
                <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl">
                  <SelectValue placeholder={t("candidates.notSpecified")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not specified" className="text-xs">
                    {t("candidates.notSpecified")}
                  </SelectItem>
                  <SelectItem value="Male" className="text-xs">
                    {t("candidates.male")}
                  </SelectItem>
                  <SelectItem value="Female" className="text-xs">
                    {t("candidates.female")}
                  </SelectItem>
                  <SelectItem value="Other" className="text-xs">
                    {t("candidates.otherGender")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date of Birth (Calendar date picker) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("candidates.dateOfBirth")}
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl shadow-xs text-xs cursor-pointer gap-2"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isSubmitting ? t("common.saving") : t("common.save")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() =>
                router.push(
                  primaryApp
                    ? `/dashboard/candidates/${primaryApp.id}`
                    : "/dashboard/candidates",
                )
              }
              className="h-10 px-5 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditCandidatePage() {
  return (
    <AuthGuard>
      <EditCandidatePageContent />
    </AuthGuard>
  );
}
