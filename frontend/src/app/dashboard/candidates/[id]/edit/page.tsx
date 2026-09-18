"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import {
  useJobs,
  useCandidate,
  useUpdateCandidateDetailsMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared/custom-select";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  parseCandidateNotes,
  normalizeDateForInput,
  isValidUuid,
} from "@/lib/utils";
import type { Gender } from "@/types";
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
  const { data: candidate, isLoading: candidateLoading } = useCandidate(rawId);
  const updateCandidateDetailsMutation = useUpdateCandidateDetailsMutation();

  // Strict UUID validation — edit candidate URL MUST be a valid UUID
  const isCandidateIdValid = isValidUuid(rawId);

  // Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | "NOT_SPECIFIED">("NOT_SPECIFIED");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Status & Validation
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form when candidate data is loaded
  useEffect(() => {
    if (candidate && !isInitialized) {
      const parsed = parseCandidateNotes(candidate.notes, candidate.name);
      setFirstName(candidate.firstName || parsed.firstName);
      setLastName(candidate.lastName || parsed.lastName);
      setDisplayName(candidate.name || parsed.displayName);
      setEmail(candidate.email || "");
      setPhone(candidate.phone || "");

      const effGender = candidate.gender || parsed.gender;
      if (effGender && effGender !== "—") {
        const upper = effGender.toUpperCase();
        if (upper === "MALE" || upper === "FEMALE" || upper === "OTHER") {
          setGender(upper as Gender);
        } else if (effGender === "Nam") {
          setGender("MALE");
        } else if (effGender === "Nữ") {
          setGender("FEMALE");
        } else {
          setGender("NOT_SPECIFIED");
        }
      }
      const effDob = candidate.dateOfBirth || parsed.dob;
      if (effDob && effDob !== "—") {
        setDateOfBirth(normalizeDateForInput(effDob));
      }
      setIsInitialized(true);
    }
  }, [candidate, isInitialized]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

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

      await updateCandidateDetailsMutation.mutateAsync({
        id: candidate.id,
        data: {
          name: effectiveDisplayName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender: gender && gender !== "NOT_SPECIFIED" ? gender : undefined,
          dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          notes: candidate.notes || undefined,
        },
      });

      // Navigate back to Candidate Detail using UUID
      router.push(`/dashboard/candidates/${candidate.id}`);
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

  if (candidateLoading && !isInitialized && isCandidateIdValid) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          jobsCount={jobs.length}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if ((!isCandidateIdValid || !candidate) && !candidateLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          jobsCount={jobs.length}
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
        jobsCount={jobs.length}
      />

      {/* Main Content Form */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href={
              candidate
                ? `/dashboard/candidates/${candidate.id}`
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
              <CustomSelect
                value={gender}
                onChange={(val) => setGender(val as Gender | "NOT_SPECIFIED")}
                options={[
                  { value: "NOT_SPECIFIED", label: t("candidates.notSpecified") },
                  { value: "MALE", label: t("candidates.male") },
                  { value: "FEMALE", label: t("candidates.female") },
                  { value: "OTHER", label: t("candidates.otherGender") },
                ]}
                className="w-full"
                triggerClassName="h-10 text-xs font-normal bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
              />
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
                  candidate
                    ? `/dashboard/candidates/${candidate.id}`
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
