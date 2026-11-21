"use client";

import {
  useState,
  useRef,
  useEffect,
  type DragEvent,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { usePermissionState } from "@/hooks/use-has-permission";
import { useCreateCandidateMutation } from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared/custom-select";
import type { Gender } from "@/types";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import { createCandidateSchema } from "@haihire/shared";
import { getApiErrorMessage } from "@/lib/api-error";

function AddCandidatePageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { localization } = useLocalization();
  const isLastFirst = localization.nameDisplayOrder === "LAST_FIRST";
  const { t } = useI18n();
  const canCreateCandidateState = usePermissionState("candidate:create");
  const canCreateCandidate = canCreateCandidateState.allowed;
  const permLoading = canCreateCandidateState.isLoading;

  useEffect(() => {
    if (!authLoading && !permLoading && !canCreateCandidate) {
      router.replace("/candidates");
    }
  }, [authLoading, permLoading, canCreateCandidate, router]);

  const createCandidateMutation = useCreateCandidateMutation();

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | "NOT_SPECIFIED">(
    "NOT_SPECIFIED",
  );
  const [dateOfBirth, setDateOfBirth] = useState("");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Validation
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Drag & Drop
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const validation = createCandidateSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
    });

    if (!validation.success) {
      if (isLastFirst) {
        if (!lastName.trim()) {
          setErrorMsg(t("candidates.errors.lastNameRequired"));
          return;
        }
        if (!firstName.trim()) {
          setErrorMsg(t("candidates.errors.firstNameRequired"));
          return;
        }
      } else {
        if (!firstName.trim()) {
          setErrorMsg(t("candidates.errors.firstNameRequired"));
          return;
        }
        if (!lastName.trim()) {
          setErrorMsg(t("candidates.errors.lastNameRequired"));
          return;
        }
      }
      if (!email.trim() || !email.includes("@")) {
        setErrorMsg(t("candidates.errors.validEmailRequired"));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      if (displayName.trim()) {
        formData.append("displayName", displayName.trim());
      }
      if (gender && gender !== "NOT_SPECIFIED") {
        formData.append("gender", gender);
      }
      if (dateOfBirth && dateOfBirth.trim() && dateOfBirth !== "—") {
        formData.append("dateOfBirth", dateOfBirth.trim());
      }
      formData.append("email", email.trim());
      if (phone.trim()) formData.append("phone", phone.trim());
      if (user?.organizationId)
        formData.append("organizationId", user.organizationId);

      if (selectedFile) {
        formData.append("resume", selectedFile);
      }

      await createCandidateMutation.mutateAsync(formData);
      router.push("/candidates");
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, t, "candidates.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>
            {t("common.back")}: {t("candidates.title")}
          </span>
        </Link>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("candidates.addCandidateTitle")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
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
          className={`rounded-xl border-2 border-dashed p-7 text-center transition-all ${
            isDragging
              ? "border-primary bg-accent/50"
              : selectedFile
                ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                : "border-border bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                  title={t("candidates.removeFile")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                {t("candidates.cvAttached", {
                  size: (selectedFile.size / 1024).toFixed(0),
                })}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-1">
                <UploadCloud className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">
                {t("candidates.dropCv")}
              </h4>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                {t("candidates.dropCvHint")}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2.5 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-accent transition-colors cursor-pointer"
              >
                {t("candidates.chooseFile")}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(isLastFirst
            ? [
                {
                  key: "lastName",
                  label: t("candidates.lastName"),
                  placeholder: t("candidates.placeholders.lastName"),
                  value: lastName,
                  onChange: setLastName,
                },
                {
                  key: "firstName",
                  label: t("candidates.firstName"),
                  placeholder: t("candidates.placeholders.firstName"),
                  value: firstName,
                  onChange: setFirstName,
                },
              ]
            : [
                {
                  key: "firstName",
                  label: t("candidates.firstName"),
                  placeholder: t("candidates.placeholders.firstName"),
                  value: firstName,
                  onChange: setFirstName,
                },
                {
                  key: "lastName",
                  label: t("candidates.lastName"),
                  placeholder: t("candidates.placeholders.lastName"),
                  value: lastName,
                  onChange: setLastName,
                },
              ]
          ).map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {field.label} <span className="text-destructive">*</span>
              </label>
              <Input
                required
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          ))}
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            {t("candidates.displayName")}{" "}
            <span className="text-[11px] font-normal text-muted-foreground">
              {t("candidates.displayNameHint")}
            </span>
          </label>
          <Input
            placeholder={t("candidates.placeholders.displayName")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-10 text-xs"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            {t("candidates.email")} <span className="text-destructive">*</span>
          </label>
          <Input
            type="email"
            required
            placeholder={t("candidates.placeholders.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 text-xs"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            {t("candidates.phone")}
          </label>
          <Input
            type="tel"
            placeholder={t("candidates.placeholders.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 text-xs"
          />
        </div>

        {/* 2 Columns: Gender & Date of Birth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t("candidates.gender")}
            </label>
            <CustomSelect
              value={gender}
              onChange={(val) => setGender(val as Gender | "NOT_SPECIFIED")}
              options={[
                {
                  value: "NOT_SPECIFIED",
                  label: t("candidates.notSpecified"),
                },
                { value: "MALE", label: t("candidates.male") },
                { value: "FEMALE", label: t("candidates.female") },
                { value: "OTHER", label: t("candidates.otherGender") },
              ]}
              className="w-full"
              triggerClassName="h-10 text-xs font-normal"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t("candidates.dateOfBirth")}
            </label>
            <Input
              type="date"
              placeholder={t("candidates.placeholders.dob")}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
        </div>

        {/* Error Message Display */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-5 font-semibold text-xs cursor-pointer"
          >
            {isSubmitting ? t("common.saving") : t("candidates.addCandidate")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/candidates")}
            className="px-4 text-xs cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AddCandidatePage() {
  return <AddCandidatePageContent />;
}
