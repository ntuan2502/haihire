"use client";

import { SettingsButton } from "@/components/settings/settings-button";
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
    <div className="xl:col-span-8 w-full rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-6 shadow-xs space-y-5 min-w-0">
      {activeTemplate.isSystem && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-3.5 py-2.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{t("email.systemProtectedHint")}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
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
            className="rounded border-input accent-primary focus-visible:ring-ring h-4 w-4 cursor-pointer"
          />
          <div>
            <label
              htmlFor="enableTemplateCheckbox"
              className="text-xs font-semibold text-foreground cursor-pointer"
            >
              {t("email.templateEnabledLabel")}
            </label>
            <p className="text-[11px] text-muted-foreground">
              {t("email.templateEnabledDesc")}
            </p>
          </div>
        </div>

        <SettingsButton
          variant="outline"
          type="button"
          icon={Eye}
          onClick={onOpenPreview}
        >
          {t("email.livePreview")}
        </SettingsButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="template-name-input"
            className="block text-xs font-medium text-foreground mb-1.5"
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
            className="block text-xs font-medium text-foreground mb-1.5"
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
          className="block text-xs font-medium text-foreground mb-1.5"
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
            className="block text-xs font-medium text-foreground"
          >
            {t("email.body")}
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
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
          className="w-full p-3.5 rounded-lg border border-input bg-transparent dark:bg-input/30 text-xs text-foreground font-mono leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 shadow-xs"
        />
      </div>

      <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Sparkles
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span>{t("email.insertVariableHint")}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              disabled={!canManageTemplates}
              onClick={() => onInsertVariable(v.key)}
              className="px-2.5 py-1 rounded-md bg-background border border-border text-[11px] font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title={t(v.labelKey as TranslationKey) || v.label}
            >
              {v.key}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border">
        <div className="flex flex-wrap items-center gap-2">
          {activeTemplate.isSystem && (
            <SettingsButton
              type="button"
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={onResetDefault}
              disabled={!canManageTemplates || isSaving}
            >
              {t("email.resetDefault")}
            </SettingsButton>
          )}

          {canManageTemplates && !activeTemplate.isSystem && (
            <SettingsButton
              type="button"
              variant="destructive"
              size="sm"
              icon={Trash2}
              onClick={onDelete}
              disabled={isDeleting}
            >
              {t("email.deleteBtn")}
            </SettingsButton>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {canManageTemplates && !activeTemplate.id.startsWith("tpl-") && (
            <SettingsButton
              type="button"
              variant="outline"
              size="sm"
              icon={Copy}
              onClick={onDuplicate}
              disabled={isDuplicating}
            >
              {t("email.duplicateBtn")}
            </SettingsButton>
          )}

          <SettingsButton
            type="button"
            variant="outline"
            size="sm"
            icon={Eye}
            onClick={onOpenPreview}
          >
            {t("email.livePreview")}
          </SettingsButton>

          {canManageTemplates && (
            <SettingsButton
              type="button"
              size="sm"
              icon={Save}
              pending={isSaving}
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? t("common.saving") : t("email.saveTemplate")}
            </SettingsButton>
          )}
        </div>
      </div>
    </div>
  );
}
