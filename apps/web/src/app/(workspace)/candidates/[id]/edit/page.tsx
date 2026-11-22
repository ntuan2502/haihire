"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { usePermissionState } from "@/hooks/use-has-permission";
import {
  useCandidate,
  useUpdateCandidateDetailsMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared/custom-select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatusState } from "@/components/shared/status-state";
import { ArrowLeft, Loader2 } from "lucide-react";
import { normalizeDateForInput, isValidUuid } from "@/lib/utils";
import type { Gender } from "@/types";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";

function EditCandidatePageContent() {
  const params = useParams();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { localization } = useLocalization();
  const isLastFirst = localization.nameDisplayOrder === "LAST_FIRST";
  const { t } = useI18n();
  const canUpdateCandidateState = usePermissionState("candidate:update");
  const canUpdateCandidate = canUpdateCandidateState.allowed;
  const permLoading = canUpdateCandidateState.isLoading;

  useEffect(() => {
    if (!authLoading && !permLoading && !canUpdateCandidate) {
      router.replace("/candidates");
    }
  }, [authLoading, permLoading, canUpdateCandidate, router]);

  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;

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
  const [gender, setGender] = useState<Gender | "NOT_SPECIFIED">(
    "NOT_SPECIFIED",
  );
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Status & Validation
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form when candidate data is loaded
  useEffect(() => {
    if (candidate && !isInitialized) {
      setFirstName(candidate.firstName || "");
      setLastName(candidate.lastName || "");
      setDisplayName(candidate.displayName || "");
      setEmail(candidate.email || "");
      setPhone(candidate.phone || "");

      const effGender = candidate.gender;
      if (
        effGender === "MALE" ||
        effGender === "FEMALE" ||
        effGender === "OTHER"
      ) {
        setGender(effGender);
      } else {
        setGender("NOT_SPECIFIED");
      }
      const effDob = candidate.dateOfBirth;
      if (effDob) {
        setDateOfBirth(normalizeDateForInput(effDob));
      }
      setIsInitialized(true);
    }
  }, [candidate, isInitialized]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    setErrorMsg("");

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

    try {
      setIsSubmitting(true);

      await updateCandidateDetailsMutation.mutateAsync({
        id: candidate.id,
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName.trim() || null,
          gender: gender && gender !== "NOT_SPECIFIED" ? gender : undefined,
          dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
        },
      });

      // Navigate back to Candidate Detail using UUID
      router.push(`/candidates/${candidate.id}`);
    } catch (err: unknown) {
      console.error("Failed to update candidate:", err);
      setErrorMsg(getApiErrorMessage(err, t, "candidates.updateFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (candidateLoading && !isInitialized && isCandidateIdValid) {
    return <LoadingSpinner />;
  }

  if ((!isCandidateIdValid || !candidate) && !candidateLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <StatusState
          status="404"
          variant="page"
          title={t("candidates.noCandidatesFound")}
          description={
            !isCandidateIdValid
              ? t("candidates.invalidCandidateId")
              : t("candidates.candidateNotFound")
          }
          actionLabel={`${t("common.back")}: ${t("candidates.title")}`}
          onAction={() => router.push("/candidates")}
          actionVariant="outline"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href={candidate ? `/candidates/${candidate.id}` : "/candidates"}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("common.back")}</span>
        </Link>
      </div>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("candidates.editCandidateTitle")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("candidates.editCandidateSubtitle")}
        </p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
            {errorMsg}
          </div>
        )}

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

          {/* Date of Birth (Calendar date picker) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t("candidates.dateOfBirth")}
            </label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-3 pt-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="font-semibold h-10 px-5 text-xs cursor-pointer gap-2"
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
                candidate ? `/candidates/${candidate.id}` : "/candidates",
              )
            }
            className="h-10 px-5 text-xs cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditCandidatePage() {
  return <EditCandidatePageContent />;
}
