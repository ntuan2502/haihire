"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import { FileUp, ShieldCheck } from "lucide-react";
import type { ApplicationFormFieldMode } from "@/types";
import type { ScreeningQuestion } from "./types";

interface WizardPreviewFormCardProps {
  previewDevice: "desktop" | "tablet" | "mobile";
  isLastFirst: boolean;
  phoneSetting: ApplicationFormFieldMode;
  resumeSetting: ApplicationFormFieldMode;
  coverLetterSetting: ApplicationFormFieldMode;
  screeningQuestions: ScreeningQuestion[];
}

export function WizardPreviewFormCard({
  previewDevice,
  isLastFirst,
  phoneSetting,
  resumeSetting,
  coverLetterSetting,
  screeningQuestions,
}: WizardPreviewFormCardProps) {
  const { t } = useI18n();

  const nameFields = isLastFirst
    ? [
        {
          key: "lastName",
          label: t("careers.lastName"),
          placeholder: t("careers.placeholders.lastName"),
        },
        {
          key: "firstName",
          label: t("careers.firstName"),
          placeholder: t("careers.placeholders.firstName"),
        },
      ]
    : [
        {
          key: "firstName",
          label: t("careers.firstName"),
          placeholder: t("careers.placeholders.firstName"),
        },
        {
          key: "lastName",
          label: t("careers.lastName"),
          placeholder: t("careers.placeholders.lastName"),
        },
      ];

  return (
    <div
      className={cn(
        "min-w-0",
        previewDevice === "desktop"
          ? "lg:col-span-5 lg:sticky lg:top-4"
          : "col-span-1",
      )}
    >
      <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card text-card-foreground shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("careers.applicationFormTitle")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("careers.applicationFormSubtitle")}
          </p>
        </div>

        <div className="space-y-3.5">
          {/* First name + Last name dynamically ordered by org nameDisplayOrder */}
          <div
            className={cn(
              "grid gap-3",
              previewDevice === "desktop"
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1",
            )}
          >
            {nameFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {field.label} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder={field.placeholder}
                  disabled
                  className="h-8 text-xs cursor-not-allowed opacity-80"
                />
              </div>
            ))}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t("careers.email")} <span className="text-destructive">*</span>
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
              <label className="text-xs font-medium text-foreground">
                {t("candidates.phone")}{" "}
                {phoneSetting === "required" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal">
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

          {/* Cover Letter */}
          {coverLetterSetting !== "hidden" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("careers.coverLetterLabel")}{" "}
                {coverLetterSetting === "required" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal">
                    ({t("jobs.wizard.optionalOption")})
                  </span>
                )}
              </label>
              <Textarea
                placeholder={t("careers.coverLetterPlaceholder")}
                disabled
                rows={2}
                className="text-xs cursor-not-allowed opacity-80 resize-none"
              />
            </div>
          )}

          {/* Screening Questions Preview */}
          {screeningQuestions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border">
              <h4 className="text-[11px] font-semibold text-foreground">
                {t("jobs.wizard.screeningQuestionsPreviewTitle")}
              </h4>
              {screeningQuestions.map((q) => (
                <div key={q.id} className="space-y-1">
                  <label className="block text-xs font-medium text-foreground">
                    {q.text}{" "}
                    {q.required && <span className="text-destructive">*</span>}
                  </label>
                  {q.type === "yes_no" ? (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          disabled
                          name={`q_${q.id}`}
                          className="h-3 w-3"
                        />
                        <span>{t("common.yes")}</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          disabled
                          name={`q_${q.id}`}
                          className="h-3 w-3"
                        />
                        <span>{t("common.no")}</span>
                      </label>
                    </div>
                  ) : q.type === "single_choice" ||
                    q.type === "multiple_choice" ? (
                    <div className="space-y-1 pt-0.5">
                      {(q.options ?? []).map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <input
                            type={
                              q.type === "single_choice" ? "radio" : "checkbox"
                            }
                            disabled
                            className="h-3 w-3"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : q.type === "long_text" ? (
                    <Textarea
                      placeholder={t("jobs.wizard.answerPlaceholder")}
                      disabled
                      rows={2}
                      className="text-xs cursor-not-allowed opacity-80 resize-none"
                    />
                  ) : q.type === "number" ? (
                    <Input
                      type="number"
                      placeholder={t("careers.numberAnswerPlaceholder")}
                      disabled
                      className="h-8 text-xs cursor-not-allowed opacity-80"
                    />
                  ) : q.type === "date" ? (
                    <Input
                      type="date"
                      disabled
                      className="h-8 text-xs cursor-not-allowed opacity-80"
                    />
                  ) : q.type === "url" ? (
                    <Input
                      type="url"
                      placeholder={t("careers.urlAnswerPlaceholder")}
                      disabled
                      className="h-8 text-xs cursor-not-allowed opacity-80"
                    />
                  ) : q.type === "file_upload" ? (
                    <div className="border border-dashed border-border rounded-lg p-3 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2 bg-muted/25">
                      <FileUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{t("careers.uploadScreeningPdf")}</span>
                    </div>
                  ) : (
                    <Input
                      type="text"
                      placeholder={t("jobs.wizard.answerPlaceholder")}
                      disabled
                      className="h-8 text-xs cursor-not-allowed opacity-80"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Resume / CV Upload Box */}
          {resumeSetting !== "hidden" && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-foreground">
                {t("careers.cvResume")}{" "}
                {resumeSetting === "required" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal">
                    ({t("jobs.wizard.optionalOption")})
                  </span>
                )}
              </label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center space-y-1.5 bg-muted/30">
                <FileUp className="h-5 w-5 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  {t("careers.dropCvHere")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("careers.cvFormats")}
                </p>
              </div>
            </div>
          )}

          <Button
            type="button"
            disabled
            className="w-full h-10 rounded-md text-xs font-semibold cursor-not-allowed opacity-90 mt-2"
          >
            {t("careers.submitApplication")}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("jobs.wizard.securityGuaranteed")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
