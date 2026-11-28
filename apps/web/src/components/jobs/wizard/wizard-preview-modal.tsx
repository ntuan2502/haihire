"use client";

import {
  OrganizationLogo,
  PreviewModal,
  DevicePreviewFrame,
  DevicePreviewSelector,
  RichTextContent,
} from "@/components/shared";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { cn } from "cn";
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Globe2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  formatDateOnlyDisplay,
  getJobTypeLabel,
  getWorkplaceLabel,
  getExperienceLevelLabel,
} from "@/lib/jobs";
import type {
  ApplicationFormFieldMode,
  Job,
  JobType,
  WorkplaceType,
  ExperienceLevel,
} from "@/types";
import type { ScreeningQuestion } from "./types";
import { WizardPreviewFormCard } from "./wizard-preview-form-card";

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
  applicationDeadline?: string;
  startDate?: string;
  openings?: number;
  description: string;
  phoneSetting: ApplicationFormFieldMode;
  resumeSetting: ApplicationFormFieldMode;
  coverLetterSetting: ApplicationFormFieldMode;
  screeningQuestions: ScreeningQuestion[];
  orgName?: string;
  orgLogoUrl?: string | null;
}

export function WizardPreviewModal({
  isOpen,
  onClose,
  initialJob: _initialJob,
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
  applicationDeadline,
  startDate,
  openings,
  description,
  phoneSetting,
  resumeSetting,
  coverLetterSetting,
  screeningQuestions,
  orgName,
  orgLogoUrl,
}: WizardPreviewModalProps) {
  const { t, locale } = useI18n();
  const { localization } = useLocalization();
  const isLastFirst = localization.nameDisplayOrder === "LAST_FIRST";

  return (
    <PreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("jobs.wizard.previewModalTitle")}
      badge={
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border">
          {t("jobs.wizard.previewLiveBadge")}
        </span>
      }
      size="xl"
      height="h-[90dvh]"
      allowMaximize={true}
      headerActions={
        <DevicePreviewSelector
          device={previewDevice}
          onChange={setPreviewDevice}
        />
      }
    >
      {({ isMaximized }) => (
        <DevicePreviewFrame device={previewDevice} isMaximized={isMaximized}>
          <div
            key={`job-preview-content-${previewDevice}`}
            className={cn(
              "w-full",
              previewDevice === "mobile"
                ? "p-4 space-y-5"
                : previewDevice === "tablet"
                  ? "p-6 sm:p-8 space-y-6 max-w-3xl mx-auto"
                  : "p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 w-full",
            )}
          >
            {/* Top Branding / Department Tag */}
            <div className="space-y-3">
              {orgName && (
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <OrganizationLogo
                    name={orgName}
                    logoUrl={orgLogoUrl}
                    size="sm"
                    decorative
                  />
                  <span>{orgName}</span>
                </div>
              )}

              <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                <span>{department || t("jobs.wizard.generalDepartment")}</span>
              </div>

              {/* Job Title */}
              <h1
                className={cn(
                  "font-bold text-foreground tracking-tight leading-tight",
                  previewDevice === "mobile"
                    ? "text-lg sm:text-xl"
                    : "text-2xl sm:text-3xl",
                )}
              >
                {jobTitle.trim() || t("jobs.wizard.untitledJobPreview")}
              </h1>

              {/* Meta Badges Grid */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-foreground/90">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border shadow-2xs">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {location || t("jobs.wizard.nationwide")}
                    {postalCode ? ` (${postalCode})` : ""}
                  </span>
                </div>

                {employmentType && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border shadow-2xs">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{getJobTypeLabel(employmentType, t)}</span>
                  </div>
                )}

                {workplace && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border shadow-2xs">
                    <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{getWorkplaceLabel(workplace, t)}</span>
                  </div>
                )}

                {experienceLevel && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border shadow-2xs">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{getExperienceLevelLabel(experienceLevel, t)}</span>
                  </div>
                )}

                {salaryRange && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs font-semibold">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{salaryRange}</span>
                  </div>
                )}

                {applicationDeadline && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border shadow-2xs">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {t("careers.applicationDeadline", {
                        date: formatDateOnlyDisplay(
                          applicationDeadline,
                          localization,
                          locale,
                        ),
                      })}
                    </span>
                  </div>
                )}

                {startDate && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border shadow-2xs">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {t("careers.startDate", {
                        date: formatDateOnlyDisplay(
                          startDate,
                          localization,
                          locale,
                        ),
                      })}
                    </span>
                  </div>
                )}

                {openings && openings > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border shadow-2xs">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {t("careers.openingsCount", { count: openings })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Two-Column or Stack Layout based on device preview */}
            <div
              className={cn(
                "grid gap-6 sm:gap-8 items-start",
                previewDevice === "desktop" ? "lg:grid-cols-12" : "grid-cols-1",
              )}
            >
              {/* Left Column in Preview: Unified Description */}
              <div
                className={cn(
                  "space-y-6 min-w-0",
                  previewDevice === "desktop" ? "lg:col-span-7" : "col-span-1",
                )}
              >
                {/* Job Description */}
                <div className="space-y-3">
                  <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    {t("careers.jobDescription")}
                  </h2>
                  <RichTextContent
                    content={description}
                    emptyFallback={t("jobs.wizard.noDescEntered")}
                    className="text-xs sm:text-sm"
                  />
                </div>

                {/* Assurance Card */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-semibold text-foreground">
                      {t("careers.transparentProcessTitle")}
                    </p>
                    <p className="leading-relaxed text-[11px]">
                      {t("careers.transparentProcessDesc", {
                        orgName: orgName || t("jobs.wizard.generalDepartment"),
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <WizardPreviewFormCard
                previewDevice={previewDevice}
                isLastFirst={isLastFirst}
                phoneSetting={phoneSetting}
                resumeSetting={resumeSetting}
                coverLetterSetting={coverLetterSetting}
                screeningQuestions={screeningQuestions}
              />
            </div>
          </div>
        </DevicePreviewFrame>
      )}
    </PreviewModal>
  );
}
