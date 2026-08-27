"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
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
import { parseCandidateNotes } from "@/lib/utils";

function EditCandidatePageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: applications = [], isLoading: loadingApps } = useAllApplications();
  const updateCandidateMutation = useUpdateCandidateMutation();

  // Find candidate by application ID or candidate email
  const primaryApp = applications.find((a) => {
    if (String(a.id) === rawId) return true;
    if (decodeURIComponent(rawId || "").toLowerCase() === a.candidateEmail.toLowerCase())
      return true;
    return false;
  });

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
      const nameParts = (primaryApp.candidateName || "").trim().split(/\s+/);
      if (nameParts.length > 1) {
        setFirstName(nameParts[0]);
        setLastName(nameParts.slice(1).join(" "));
      } else {
        setFirstName(nameParts[0] || "");
        setLastName("");
      }
      setEmail(primaryApp.candidateEmail || "");
      setPhone(primaryApp.candidatePhone || "");

      const parsed = parseCandidateNotes(primaryApp.notes);
      if (parsed.gender && parsed.gender !== "—") {
        setGender(parsed.gender);
      }
      if (parsed.dob && parsed.dob !== "—") {
        setDateOfBirth(parsed.dob);
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
      const fullName = displayName.trim()
        ? displayName.trim()
        : `${firstName.trim()} ${lastName.trim()}`;

      // Build updated notes preserving any custom notes
      let newNotes = primaryApp.notes || "";
      newNotes = newNotes.replace(/Gender:\s*[^|]+\|?/i, "").replace(/DOB:\s*[^|]+\|?/i, "").trim();

      const notesSegments: string[] = [];
      if (gender && gender !== "Not specified" && gender !== "—") {
        notesSegments.push(`Gender: ${gender}`);
      }
      if (dateOfBirth.trim() && dateOfBirth !== "—") {
        notesSegments.push(`DOB: ${dateOfBirth.trim()}`);
      }
      if (newNotes) {
        notesSegments.push(newNotes);
      }

      const finalNotes = notesSegments.join(" | ");

      await updateCandidateMutation.mutateAsync({
        id: primaryApp.id,
        data: {
          candidateName: fullName,
          candidateEmail: email.trim(),
          candidatePhone: phone.trim() || undefined,
          notes: finalNotes || undefined,
        },
      });

      router.push(`/dashboard/candidates/${encodeURIComponent(email.trim())}`);
    } catch (err: unknown) {
      console.error("Failed to update candidate:", err);
      const maybeAxios = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        maybeAxios?.response?.data?.message ||
          "Failed to update candidate. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingApps && !isInitialized) {
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

  if (!primaryApp && !loadingApps) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => {}}
          jobsCount={jobs.length}
          candidatesCount={applications.length}
        />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Candidate not found
          </h2>
          <p className="text-xs text-slate-500">
            The candidate you are trying to edit does not exist or has been removed.
          </p>
          <Button
            onClick={() => router.push("/dashboard/candidates")}
            variant="outline"
            className="text-xs"
          >
            Back to Candidates
          </Button>
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
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href={
              primaryApp
                ? `/dashboard/candidates/${encodeURIComponent(primaryApp.candidateEmail)}`
                : "/dashboard/candidates"
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Candidates</span>
          </Link>
        </div>

        {/* Heading matching Screenshot 1 */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Edit Candidate
          </h1>
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
              First Name <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              required
              placeholder="e.g. jane.doe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Phone
            </label>
            <Input
              type="tel"
              placeholder="e.g. +64155409586"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Display Name{" "}
              <span className="text-[11px] font-normal text-slate-400">
                (optional — overrides default name format)
              </span>
            </label>
            <Input
              placeholder="e.g. Nguyễn Văn A"
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
                Gender
              </label>
              <Select value={gender} onValueChange={(val) => val && setGender(val)}>
                <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not specified" className="text-xs">
                    Not specified
                  </SelectItem>
                  <SelectItem value="Male" className="text-xs">
                    Male
                  </SelectItem>
                  <SelectItem value="Female" className="text-xs">
                    Female
                  </SelectItem>
                  <SelectItem value="Other" className="text-xs">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Date of Birth
              </label>
              <Input
                type="text"
                placeholder="e.g. 06/23/1994"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>

          {/* Form Actions matching Screenshot 1 */}
          <div className="flex items-center gap-3 pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl shadow-xs text-xs cursor-pointer gap-2"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Changes</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() =>
                router.push(
                  primaryApp
                    ? `/dashboard/candidates/${encodeURIComponent(primaryApp.candidateEmail)}`
                    : "/dashboard/candidates",
                )
              }
              className="h-10 px-5 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
            >
              Cancel
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
