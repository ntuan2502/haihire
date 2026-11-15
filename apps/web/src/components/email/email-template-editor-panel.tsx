"use client";

import type { RefObject } from "react";
import {
  Copy,
  Eye,
  Lock,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared";
import { useI18n, type TranslationKey } from "@/i18n";
import {
  getEmailTemplateTypeOptions,
  TEMPLATE_VARIABLES,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/lib/email-templates";

interface EmailTemplateEditorPanelProps {
  activeTemplate: EmailTemplate;
  canManageTemplates: boolean;
  onDraftChange: (
    updater: (prev: EmailTemplate | null) => EmailTemplate | null,
  ) => void;
  onOpenPreview: () => void;
  onResetDefault: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSave: () => void;
  onInsertVariable: (varKey: string) => void;
  bodyTextareaRef: RefObject<HTMLTextAreaElement | null>;
  isSaving: boolean;
  isDeleting: boolean;
  isDuplicating: boolean;
}

export function EmailTemplateEditorPanel({
  activeTemplate,
  canManageTemplates,
  onDraftChange,
  onOpenPreview,
  onResetDefault,
  onDelete,
  onDuplicate,
  onSave,
  onInsertVariable,
  bodyTextareaRef,
  isSaving,
  isDeleting,
  isDuplicating,
}: EmailTemplateEditorPanelProps) {
  const { t } = useI18n();

  return (
    <div className="xl:col-span-8 w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 min-w-0">
      {activeTemplate.isSystem && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 px-3.5 py-2.5 text-xs text-blue-800 dark:text-blue-300">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>{t("email.systemProtectedHint")}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enableTemplateCheckbox"
            checked={Boolean(activeTemplate.enabled)}
            disabled={!canManageTemplates}
            onChange={(e) =>
              onDraftChange((prev) =>
                prev ? { ...prev, enabled: e.target.checked } : prev,
              )
            }
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
          />
          <div>
            <label
              htmlFor="enableTemplateCheckbox"
              className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
            >
              {t("email.templateEnabledLabel")}
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t("email.templateEnabledDesc")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPreview}
          className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
        >
          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>{t("email.livePreview")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="template-name-input"
            className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
          >
            {t("email.templateTitleLabel")}
          </label>
          <Input
            id="template-name-input"
            value={activeTemplate.name}
            disabled={!canManageTemplates}
            onChange={(e) =>
              onDraftChange((prev) =>
                prev ? { ...prev, name: e.target.value } : prev,
              )
            }
            placeholder={t("email.templateTitlePlaceholder")}
            className="h-9 text-xs"
          />
        </div>

        <div>
          <label
            htmlFor="template-category-select"
            className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
          >
            {t("email.templateCategoryLabel")}
          </label>
          <CustomSelect
            id="template-category-select"
            size="sm"
            value={activeTemplate.type}
            disabled={!canManageTemplates}
            onChange={(val) =>
              onDraftChange((prev) =>
                prev ? { ...prev, type: val as EmailTemplateType } : prev,
              )
            }
            options={getEmailTemplateTypeOptions(t)}
            className="w-full"
            triggerClassName="h-9 text-xs"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="template-subject-input"
          className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
        >
          {t("email.subject")}
        </label>
        <Input
          id="template-subject-input"
          value={activeTemplate.subject}
          disabled={!canManageTemplates}
          onChange={(e) =>
            onDraftChange((prev) =>
              prev ? { ...prev, subject: e.target.value } : prev,
            )
          }
          placeholder={t("email.subjectPlaceholder")}
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="template-body-input"
            className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            {t("email.body")}
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {t("email.htmlAndVariables")}
          </span>
        </div>
        <textarea
          id="template-body-input"
          ref={bodyTextareaRef}
          value={activeTemplate.body}
          disabled={!canManageTemplates}
          onChange={(e) =>
            onDraftChange((prev) =>
              prev ? { ...prev, body: e.target.value } : prev,
            )
          }
          rows={13}
          placeholder={t("email.bodyPlaceholder")}
          className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
        />
      </div>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span>{t("email.insertVariableHint")}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              disabled={!canManageTemplates}
              onClick={() => onInsertVariable(v.key)}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title={t(v.labelKey as TranslationKey) || v.label}
            >
              {v.key}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {activeTemplate.isSystem && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetDefault}
              disabled={!canManageTemplates || isSaving}
              className="h-9 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("email.resetDefault")}</span>
            </Button>
          )}

          {canManageTemplates && !activeTemplate.isSystem && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-9 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("email.deleteBtn")}</span>
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {canManageTemplates && !activeTemplate.id.startsWith("tpl-") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              disabled={isDuplicating}
              className="h-9 px-3.5 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 rounded-xl"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{t("email.duplicateBtn")}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPreview}
            className="h-9 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1.5 rounded-xl shadow-2xs"
          >
            <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("email.livePreview")}</span>
          </Button>

          {canManageTemplates && (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>
                {isSaving ? t("common.saving") : t("email.saveTemplate")}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
