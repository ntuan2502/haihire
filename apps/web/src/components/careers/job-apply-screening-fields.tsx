"use client";

import type { ScreeningAnswerValue, ScreeningQuestion } from "@haihire/shared";
import { FileText, UploadCloud, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";

interface JobApplyScreeningFieldsProps {
  screeningQuestions: ScreeningQuestion[];
  screeningAnswers: Record<string, ScreeningAnswerValue>;
  setScreeningAnswers: (
    updater: (
      prev: Record<string, ScreeningAnswerValue>,
    ) => Record<string, ScreeningAnswerValue>,
  ) => void;
  screeningFiles: Record<string, File | null>;
  screeningFileErrors: Record<string, string | null>;
  onValidateAndSetScreeningFile: (questionId: string, file?: File) => void;
  onClearScreeningFile: (questionId: string) => void;
  onToggleMultiOption: (questionId: string, option: string) => void;
}

export function JobApplyScreeningFields({
  screeningQuestions,
  screeningAnswers,
  setScreeningAnswers,
  screeningFiles,
  screeningFileErrors,
  onValidateAndSetScreeningFile,
  onClearScreeningFile,
  onToggleMultiOption,
}: JobApplyScreeningFieldsProps) {
  const { t } = useI18n();

  if (screeningQuestions.length === 0) return null;

  return (
    <div className="space-y-3.5 pt-2 border-t border-border">
      <h3 className="text-xs font-semibold text-foreground">
        {t("careers.screeningSectionTitle")}
      </h3>

      {screeningQuestions.map((q) => {
        const val = screeningAnswers[q.id];
        const fieldId = `career-q-${q.id}`;

        return (
          <div key={q.id} className="space-y-1.5">
            <label
              htmlFor={fieldId}
              className="block text-xs font-medium text-foreground"
            >
              {q.text}{" "}
              {q.required ? (
                <span className="text-rose-500">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">
                  ({t("jobs.wizard.optionalOption")})
                </span>
              )}
            </label>

            {q.type === "yes_no" ? (
              <div className="flex items-center gap-4 text-xs text-foreground pt-0.5">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={fieldId}
                    checked={val === true}
                    onChange={() =>
                      setScreeningAnswers((prev) => ({
                        ...prev,
                        [q.id]: true,
                      }))
                    }
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span>{t("common.yes")}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={fieldId}
                    checked={val === false}
                    onChange={() =>
                      setScreeningAnswers((prev) => ({
                        ...prev,
                        [q.id]: false,
                      }))
                    }
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span>{t("common.no")}</span>
                </label>
              </div>
            ) : q.type === "single_choice" ? (
              <div className="space-y-1.5 pt-0.5">
                {(q.options ?? []).map((opt) => (
                  <label
                    key={opt}
                    className="flex items-start py-1 gap-2 text-xs text-foreground cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={fieldId}
                      checked={val === opt}
                      onChange={() =>
                        setScreeningAnswers((prev) => ({
                          ...prev,
                          [q.id]: opt,
                        }))
                      }
                      className="h-4 w-4 shrink-0 mt-0.5 accent-primary"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : q.type === "multiple_choice" ? (
              <div className="space-y-1.5 pt-0.5">
                {(q.options ?? []).map((opt) => {
                  const selectedList = Array.isArray(val) ? val : [];
                  return (
                    <label
                      key={opt}
                      className="flex items-start py-1 gap-2 text-xs text-foreground cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedList.includes(opt)}
                        onChange={() => onToggleMultiOption(q.id, opt)}
                        className="h-4 w-4 shrink-0 mt-0.5 accent-primary"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            ) : q.type === "long_text" ? (
              <Textarea
                id={fieldId}
                rows={3}
                placeholder={t("jobs.wizard.answerPlaceholder")}
                value={typeof val === "string" ? val : ""}
                onChange={(e) =>
                  setScreeningAnswers((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                className="w-full p-3 text-xs rounded-md bg-background resize-y"
              />
            ) : q.type === "number" ? (
              <Input
                id={fieldId}
                type="number"
                step="any"
                placeholder={t("careers.numberAnswerPlaceholder")}
                value={
                  typeof val === "string" || typeof val === "number"
                    ? String(val)
                    : ""
                }
                onChange={(e) =>
                  setScreeningAnswers((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                className="h-10 text-xs rounded-md bg-background"
              />
            ) : q.type === "date" ? (
              <Input
                id={fieldId}
                type="date"
                value={typeof val === "string" ? val : ""}
                onChange={(e) =>
                  setScreeningAnswers((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                className="h-10 text-xs rounded-md bg-background"
              />
            ) : q.type === "url" ? (
              <Input
                id={fieldId}
                type="url"
                placeholder={t("careers.urlAnswerPlaceholder")}
                value={typeof val === "string" ? val : ""}
                onChange={(e) =>
                  setScreeningAnswers((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                className="h-10 text-xs rounded-md bg-background"
              />
            ) : q.type === "file_upload" ? (
              <div className="space-y-1.5">
                <input
                  id={fieldId}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    onValidateAndSetScreeningFile(q.id, e.target.files?.[0]);
                  }}
                  className="sr-only"
                  aria-label={q.text}
                />
                {screeningFiles[q.id] ? (
                  <div className="p-3 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText
                        className="h-4 w-4 text-primary shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {screeningFiles[q.id]?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(
                            (screeningFiles[q.id]?.size ?? 0) /
                            (1024 * 1024)
                          ).toFixed(2)}{" "}
                          MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onClearScreeningFile(q.id)}
                      aria-label={t("common.delete")}
                      className="h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor={fieldId}
                    className="border border-dashed border-border hover:border-primary rounded-lg p-3.5 text-center cursor-pointer transition-colors bg-muted/40 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <UploadCloud
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t("careers.uploadScreeningPdf")}</span>
                  </label>
                )}
                {screeningFileErrors[q.id] && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    {screeningFileErrors[q.id]}
                  </p>
                )}
              </div>
            ) : (
              <Input
                id={fieldId}
                type="text"
                placeholder={t("jobs.wizard.answerPlaceholder")}
                value={typeof val === "string" ? val : ""}
                onChange={(e) =>
                  setScreeningAnswers((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                className="h-10 text-xs rounded-md bg-background"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
