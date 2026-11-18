"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import {
  Lock,
  FileUp,
  FileText,
  Plus,
  Trash2,
  Zap,
  Target,
} from "lucide-react";
import type { ScreeningQuestion } from "./types";

interface WizardStepFormProps {
  phoneSetting: "hidden" | "optional" | "required";
  setPhoneSetting: (s: "hidden" | "optional" | "required") => void;
  resumeSetting: "required" | "off";
  setResumeSetting: (s: "required" | "off") => void;
  coverLetterSetting: "required" | "off";
  setCoverLetterSetting: (s: "required" | "off") => void;
  screeningQuestions: ScreeningQuestion[];
  isAddingQuestion: boolean;
  setIsAddingQuestion: (b: boolean) => void;
  newQuestionText: string;
  setNewQuestionText: (s: string) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (id: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function WizardStepForm({
  phoneSetting,
  setPhoneSetting,
  resumeSetting,
  setResumeSetting,
  coverLetterSetting,
  setCoverLetterSetting,
  screeningQuestions,
  isAddingQuestion,
  setIsAddingQuestion,
  newQuestionText,
  setNewQuestionText,
  onAddQuestion,
  onRemoveQuestion,
  onCancel,
  onBack,
  onContinue,
}: WizardStepFormProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const isLastFirst = localization.nameDisplayOrder === "LAST_FIRST";

  const nameFieldRows = isLastFirst
    ? [
        { key: "lastName", label: t("jobs.wizard.lastNameLabel") },
        { key: "firstName", label: t("jobs.wizard.firstNameLabel") },
      ]
    : [
        { key: "firstName", label: t("jobs.wizard.firstNameLabel") },
        { key: "lastName", label: t("jobs.wizard.lastNameLabel") },
      ];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("jobs.wizard.customizeFormTitle")}
        </span>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {t("jobs.wizard.customizeFormDesc")}
        </p>
      </div>

      {/* Section 1: Personal Information */}
      <div className="space-y-4 bg-card text-card-foreground p-6 rounded-xl border border-border shadow-xs">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {t("jobs.wizard.personalInfoTitle")}
        </h3>

        <div className="space-y-2.5">
          {nameFieldRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <span>{row.label}</span>
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold">
                {t("jobs.wizard.mandatoryBadge")}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <span>{t("jobs.wizard.emailLabel")}</span>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold">
              {t("jobs.wizard.mandatoryBadge")}
            </span>
          </div>

          {/* Phone Field Configuration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-background">
            <div>
              <span className="text-xs font-semibold text-foreground">
                {t("jobs.wizard.phoneLabel")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("jobs.wizard.phoneChooseHint")}
              </p>
            </div>

            <div className="inline-flex rounded-lg bg-muted p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setPhoneSetting("hidden")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  phoneSetting === "hidden"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("jobs.wizard.hiddenOption")}
              </button>
              <button
                type="button"
                onClick={() => setPhoneSetting("optional")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  phoneSetting === "optional"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("jobs.wizard.optionalOption")}
              </button>
              <button
                type="button"
                onClick={() => setPhoneSetting("required")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  phoneSetting === "required"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("jobs.wizard.requiredOption")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Documents */}
      <div className="space-y-4 bg-card text-card-foreground p-6 rounded-xl border border-border shadow-xs">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {t("jobs.wizard.documentsTitle")}
        </h3>

        <div className="space-y-3">
          {/* Resume / CV Setting */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileUp className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground">
                  {t("jobs.wizard.resumeCvTitle")}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("jobs.wizard.resumeCvDesc")}
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-lg bg-muted p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setResumeSetting("off")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  resumeSetting === "off"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("jobs.wizard.offOption")}
              </button>
              <button
                type="button"
                onClick={() => setResumeSetting("required")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  resumeSetting === "required"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("jobs.wizard.requiredOption")}
              </button>
            </div>
          </div>

          {/* Cover Letter Setting */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground">
                  {t("jobs.wizard.coverLetterTitle")}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("jobs.wizard.coverLetterDesc")}
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-lg bg-muted p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setCoverLetterSetting("off")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  coverLetterSetting === "off"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("jobs.wizard.offOption")}
              </button>
              <button
                type="button"
                onClick={() => setCoverLetterSetting("required")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  coverLetterSetting === "required"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("jobs.wizard.requiredOption")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Screening Questions */}
      <div className="space-y-4 bg-card text-card-foreground p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t("jobs.wizard.screeningQuestionsTitle")}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("jobs.wizard.screeningQuestionsDesc")}
          </p>
        </div>

        {screeningQuestions.length === 0 && !isAddingQuestion ? (
          <div className="py-6 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center px-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("jobs.wizard.noScreeningQuestions")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingQuestion(true)}
              className="text-xs font-medium gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("jobs.wizard.addFirstQuestion")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {screeningQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {q.text}
                    </p>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {q.type === "text"
                        ? t("jobs.wizard.openTextAnswer")
                        : t("jobs.wizard.yesNoChoice")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveQuestion(q.id)}
                  className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                  title={t("jobs.wizard.deleteQuestion")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Question Inline Input Form */}
        {isAddingQuestion && (
          <div className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-3">
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.screeningQuestion")}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="h-9 text-xs bg-background"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingQuestion(false);
                  setNewQuestionText("");
                }}
                className="h-8 text-xs cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onAddQuestion}
                disabled={!newQuestionText.trim()}
                className="h-8 text-xs cursor-pointer"
              >
                {t("jobs.wizard.addQuestionAction")}
              </Button>
            </div>
          </div>
        )}

        {!isAddingQuestion && screeningQuestions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingQuestion(true)}
            className="h-9 text-xs font-medium gap-1.5 w-full sm:w-auto cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            {t("jobs.wizard.addQuestionAction")}
          </Button>
        )}

        {/* Automation & Scoring Hints */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span>{t("jobs.wizard.automationKnockoutHint")}</span>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span>{t("jobs.wizard.scoringCriteriaHint")}</span>
          </div>
        </div>
      </div>

      {/* Bottom Step 2 Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-xs cursor-pointer"
        >
          {t("common.cancel")}
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs cursor-pointer"
          >
            {t("jobs.wizard.backAction")}
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="text-xs font-semibold px-6 cursor-pointer"
          >
            {t("jobs.wizard.continueToPublish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
