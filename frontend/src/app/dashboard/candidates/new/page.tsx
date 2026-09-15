"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import {
  useJobs,
  useAllApplications,
  useCreateApplicationMutation,
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
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react";
import { buildCandidateNotes } from "@/lib/utils";
import { useI18n } from "@/i18n";

function AddCandidatePageContent() {
  const router = useRouter();
  const { user, canEdit, loading: authLoading } = useAuth();
  const { t } = useI18n();

  React.useEffect(() => {
    if (!authLoading && !canEdit) {
      router.replace("/dashboard/candidates");
    }
  }, [authLoading, canEdit, router]);

  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: applications = [] } = useAllApplications();
  const createApplicationMutation = useCreateApplicationMutation();

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Not specified");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Validation
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    // Auto-fill mock/parsed name if fields are empty
    if (!firstName && !lastName) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const parts = baseName.split(" ");
      if (parts.length > 1) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      } else {
        setFirstName(parts[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const formData = new FormData();
      formData.append("candidateName", effectiveDisplayName);
      formData.append("candidateEmail", email.trim());
      if (phone.trim()) formData.append("candidatePhone", phone.trim());

      const notes = buildCandidateNotes({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || undefined,
        gender,
        dob: dateOfBirth,
      });

      if (notes) {
        formData.append("notes", notes);
      }

      if (selectedFile) {
        formData.append("resume", selectedFile);
      }

      await createApplicationMutation.mutateAsync(formData);
      router.push("/dashboard/candidates");
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        errResponse?.response?.data?.message ||
          "Failed to create candidate. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <main className="flex-1 px-4 py-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard/candidates"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("common.back")}: {t("candidates.title")}</span>
          </Link>
        </div>

        {/* Page Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("candidates.addCandidateTitle")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("candidates.addCandidateSubtitle")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CV Upload Dropzone Container */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                : selectedFile
                  ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"
                    title={t("candidates.removeFile")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("candidates.cvAttached", { size: (selectedFile.size / 1024).toFixed(0) })}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t("candidates.dropCv")}
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  {t("candidates.dropCvHint")}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2.5 inline-flex items-center justify-center rounded-lg border border-slate-200/90 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {t("candidates.chooseFile")}
                </button>
              </div>
            )}
          </div>

          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("candidates.firstName")} <span className="text-rose-500">*</span>
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
              {t("candidates.lastName")} <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
              placeholder="e.g. Nguyễn Văn A"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              placeholder="e.g. jane.doe@example.com"
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
              placeholder="e.g. +1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("candidates.dateOfBirth")}
              </label>
              <Input
                type="date"
                placeholder="mm/dd/yyyy"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              {isSubmitting ? t("common.saving") : t("candidates.addCandidate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/candidates")}
              className="h-9 px-4 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function AddCandidatePage() {
  return (
    <AuthGuard>
      <AddCandidatePageContent />
    </AuthGuard>
  );
}
