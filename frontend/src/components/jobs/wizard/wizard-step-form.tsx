"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          {t("jobs.wizard.customizeFormTitle")}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {t("jobs.wizard.customizeFormDesc")}
        </p>
      </div>

      {/* Section 1: Personal Information */}
      <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {t("jobs.wizard.personalInfoTitle")}
        </h3>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{t("jobs.wizard.firstNameLabel")}</span>
              <Lock className="h-3 w-3 text-slate-400" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
              {t("jobs.wizard.mandatoryBadge")}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{t("jobs.wizard.lastNameLabel")}</span>
              <Lock className="h-3 w-3 text-slate-400" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
              {t("jobs.wizard.mandatoryBadge")}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{t("jobs.wizard.emailLabel")}</span>
              <Lock className="h-3 w-3 text-slate-400" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
              {t("jobs.wizard.mandatoryBadge")}
            </span>
          </div>

          {/* Phone Field Configuration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("jobs.wizard.phoneLabel")}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t("jobs.wizard.phoneChooseHint")}
              </p>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPhoneSetting("hidden")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  phoneSetting === "hidden"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("jobs.wizard.hiddenOption")}
              </button>
              <button
                type="button"
                onClick={() => setPhoneSetting("optional")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  phoneSetting === "optional"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("jobs.wizard.optionalOption")}
              </button>
              <button
                type="button"
                onClick={() => setPhoneSetting("required")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  phoneSetting === "required"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("jobs.wizard.requiredOption")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Documents */}
      <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {t("jobs.wizard.documentsTitle")}
        </h3>

        <div className="space-y-3">
          {/* Resume / CV Setting */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileUp className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t("jobs.wizard.resumeCvTitle")}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("jobs.wizard.resumeCvDesc")}
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setResumeSetting("off")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  resumeSetting === "off"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("jobs.wizard.offOption")}
              </button>
              <button
                type="button"
                onClick={() => setResumeSetting("required")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  resumeSetting === "required"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("jobs.wizard.requiredOption")}
              </button>
            </div>
          </div>

          {/* Cover Letter Setting */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t("jobs.wizard.coverLetterTitle")}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("jobs.wizard.coverLetterDesc")}
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCoverLetterSetting("off")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  coverLetterSetting === "off"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("jobs.wizard.offOption")}
              </button>
              <button
                type="button"
                onClick={() => setCoverLetterSetting("required")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  coverLetterSetting === "required"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("jobs.wizard.requiredOption")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Screening Questions */}
      <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t("jobs.wizard.screeningQuestionsTitle")}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("jobs.wizard.screeningQuestionsDesc")}
          </p>
        </div>

        {screeningQuestions.length === 0 && !isAddingQuestion ? (
          <div className="py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center px-4 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("jobs.wizard.noScreeningQuestions")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingQuestion(true)}
              className="text-xs font-bold gap-1.5"
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
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {q.text}
                    </p>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {q.type === "text"
                        ? t("jobs.wizard.openTextAnswer")
                        : t("jobs.wizard.yesNoChoice")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveQuestion(q.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
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
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.screeningQuestion")}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-slate-900"
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
                className="h-8 text-xs"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onAddQuestion}
                disabled={!newQuestionText.trim()}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
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
            className="h-9 text-xs font-bold text-slate-800 dark:text-slate-200 gap-1.5 w-full sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            {t("jobs.wizard.addQuestionAction")}
          </Button>
        )}

        {/* Automation & Scoring Hints */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Zap className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{t("jobs.wizard.automationKnockoutHint")}</span>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Target className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
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
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          {t("common.cancel")}
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t("jobs.wizard.backAction")}
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            {t("jobs.wizard.continueToPublish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
