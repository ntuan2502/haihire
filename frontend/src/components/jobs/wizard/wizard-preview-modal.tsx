"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CustomModal,
  DevicePreviewFrame,
  DevicePreviewSelector,
} from "@/components/shared";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import {
  Briefcase,
  Building2,
  Clock,
  DollarSign,
  FileUp,
  Globe2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  getJobTypeLabel,
  getWorkplaceLabel,
  getExperienceLevelLabel,
} from "@/lib/jobs";
import type {
  Job,
  JobType,
  WorkplaceType,
  ExperienceLevel,
} from "@/types";
import type { ScreeningQuestion } from "./types";

interface WizardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJob?: Job | null;
  previewDevice: "desktop" | "tablet" | "mobile";
  setPreviewDevice: (d: "desktop" | "tablet" | "mobile") => void;
  jobTitle: string;
  department: string;
  location: string;
  postalCode?: string;
  employmentType: JobType | null;
  workplace: WorkplaceType | null;
  experienceLevel: ExperienceLevel | null;
  salaryRange?: string;
  description: string;
  requirements: string;
  phoneSetting: "hidden" | "optional" | "required";
  resumeSetting: "required" | "off";
  coverLetterSetting: "required" | "off";
  screeningQuestions: ScreeningQuestion[];
  orgName?: string;
}

export function WizardPreviewModal({
  isOpen,
  onClose,
  initialJob,
  previewDevice,
  setPreviewDevice,
  jobTitle,
  department,
  location,
  postalCode,
  employmentType,
  workplace,
  experienceLevel,
  salaryRange,
  description,
  requirements,
  phoneSetting,
  resumeSetting,
  coverLetterSetting,
  screeningQuestions,
  orgName,
}: WizardPreviewModalProps) {
  const { t } = useI18n();

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("jobs.wizard.previewModalTitle")}
      badge={t("jobs.wizard.previewLiveBadge")}
      maxWidth="max-w-6xl"
      height="h-[90vh]"
      allowMaximize={true}
      headerRight={
        <DevicePreviewSelector
          device={previewDevice}
          onChange={setPreviewDevice}
        />
      }
    >
      {({ isMaximized }) => (
        <DevicePreviewFrame
          device={previewDevice}
          isMaximized={isMaximized}
          url={`nexus.careers/jobs/${initialJob?.id || "engineering-lead"}`}
        >
          <div
            key={`job-preview-content-${previewDevice}`}
            className={cn(
              "w-full",
              previewDevice === "mobile"
                ? "p-4 space-y-5"
                : previewDevice === "tablet"
                  ? "p-6 sm:p-8 space-y-6 max-w-3xl mx-auto"
                  : "p-6 sm:p-10 space-y-8 w-full",
            )}
          >
            {/* Top Branding / Department Tag */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>{department || t("jobs.wizard.generalDepartment")}</span>
              </div>

              {/* Job Title */}
              <h1
                className={cn(
                  "font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight",
                  previewDevice === "mobile"
                    ? "text-lg sm:text-xl"
                    : "text-2xl sm:text-3xl",
                )}
              >
                {jobTitle.trim() || t("jobs.wizard.untitledJobPreview")}
              </h1>

              {/* Meta Badges Grid */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  <span>
                    {location || t("jobs.wizard.nationwide")}
                    {postalCode ? ` (${postalCode})` : ""}
                  </span>
                </div>

                {employmentType && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{getJobTypeLabel(employmentType, t)}</span>
                  </div>
                )}

                {workplace && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{getWorkplaceLabel(workplace, t)}</span>
                  </div>
                )}

                {experienceLevel && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                    <span>
                      {getExperienceLevelLabel(experienceLevel, t)}
                    </span>
                  </div>
                )}

                {salaryRange && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs font-bold">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{salaryRange}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Two-Column or Stack Layout based on device preview */}
            <div
              className={cn(
                "grid gap-8 items-start",
                previewDevice === "desktop" ? "grid-cols-12" : "grid-cols-1",
              )}
            >
              {/* Left Column in Preview: JD & Requirements */}
              <div
                className={cn(
                  "space-y-6",
                  previewDevice === "desktop" ? "col-span-7" : "col-span-1",
                )}
              >
                {/* Job Description */}
                <div className="space-y-3">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    {t("careers.jobDescription")}
                  </h2>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line space-y-2 font-normal">
                    {description.trim() || t("jobs.wizard.noDescEntered")}
                  </div>
                </div>

                {/* Requirements */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    {t("careers.requirements")}
                  </h2>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line space-y-2 font-normal">
                    {requirements.trim() || t("jobs.wizard.noReqEntered")}
                  </div>
                </div>

                {/* Assurance Card */}
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                    <p className="font-bold text-slate-800 dark:text-white">
                      {t("careers.transparentProcessTitle")}
                    </p>
                    <p className="leading-relaxed text-[11px]">
                      {t("careers.transparentProcessDesc").replace(
                        "{orgName}",
                        orgName || t("jobs.wizard.generalDepartment"),
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column in Preview: Application Form Simulation */}
              <div
                className={cn(
                  previewDevice === "desktop"
                    ? "col-span-5 sticky top-4"
                    : "col-span-1",
                )}
              >
                <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {t("careers.applicationFormTitle")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t("careers.applicationFormSubtitle")}
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {/* First name + middle name / Last name */}
                    <div
                      className={cn(
                        "grid gap-3",
                        previewDevice === "desktop"
                          ? "grid-cols-1 sm:grid-cols-2"
                          : "grid-cols-1",
                      )}
                    >
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t("careers.lastName")}{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder={t("careers.placeholders.lastName")}
                          disabled
                          className="h-8 text-xs cursor-not-allowed opacity-80"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t("careers.firstName")}{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder={t("careers.placeholders.firstName")}
                          disabled
                          className="h-8 text-xs cursor-not-allowed opacity-80"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t("careers.email")}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder={t("careers.placeholders.email")}
                        disabled
                        className="h-8 text-xs cursor-not-allowed opacity-80"
                      />
                    </div>

                    {/* Phone */}
                    {phoneSetting !== "hidden" && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t("candidates.phone")}{" "}
                          {phoneSetting === "required" ? (
                            <span className="text-rose-500">*</span>
                          ) : (
                            <span className="text-slate-400 font-normal">
                              ({t("jobs.wizard.optionalOption")})
                            </span>
                          )}
                        </label>
                        <Input
                          type="tel"
                          placeholder={t("careers.placeholders.phone")}
                          disabled
                          className="h-8 text-xs cursor-not-allowed opacity-80"
                        />
                      </div>
                    )}

                    {/* Cover Letter / Notes */}
                    {coverLetterSetting === "required" && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t("careers.notes")}{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <Textarea
                          placeholder={t("careers.placeholders.notes")}
                          disabled
                          rows={2}
                          className="text-xs cursor-not-allowed opacity-80 resize-none"
                        />
                      </div>
                    )}

                    {/* Screening Questions Preview */}
                    {screeningQuestions.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {t("jobs.wizard.screeningQuestionsPreviewTitle")}
                        </h4>
                        {screeningQuestions.map((q) => (
                          <div key={q.id} className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {q.text}{" "}
                              {q.required && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            {q.type === "yes_no" ? (
                              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                                <label className="flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    disabled
                                    name={`q_${q.id}`}
                                    className="h-3 w-3"
                                  />
                                  <span>{t("jobs.wizard.yesOption")}</span>
                                </label>
                                <label className="flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    disabled
                                    name={`q_${q.id}`}
                                    className="h-3 w-3"
                                  />
                                  <span>{t("jobs.wizard.noOption")}</span>
                                </label>
                              </div>
                            ) : (
                              <Input
                                type="text"
                                placeholder={t(
                                  "jobs.wizard.answerPlaceholder",
                                )}
                                disabled
                                className="h-8 text-xs cursor-not-allowed opacity-80"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resume / CV Upload Box */}
                    {resumeSetting === "required" && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t("careers.cvResume")}{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center space-y-1.5 bg-white/70 dark:bg-slate-800/40">
                          <FileUp className="h-5 w-5 text-blue-500 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t("careers.dropCvHere")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {t("careers.cvFormats")}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      type="button"
                      disabled
                      className="w-full h-10 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs cursor-not-allowed opacity-90 mt-2"
                    >
                      {t("careers.submitApplication")}
                    </Button>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t("jobs.wizard.securityGuaranteed")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DevicePreviewFrame>
      )}
    </CustomModal>
  );
}
