"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, MailPlus, Sparkles } from "lucide-react";
import { CustomModal, CustomSelect } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n, type TranslationKey } from "@/i18n";
import {
  DEFAULT_EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  getEmailTemplateTypeOptions,
  type EmailTemplateType,
} from "@/lib/email-templates";

export interface EmailTemplateCreatePayload {
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  enabled: boolean;
}

export interface EmailTemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EmailTemplateCreatePayload) => Promise<void>;
  isSubmitting?: boolean;
}

export function EmailTemplateCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: EmailTemplateCreateModalProps) {
  const { t } = useI18n();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<EmailTemplateType>("CUSTOM");
  const [subject, setSubject] = useState(
    DEFAULT_EMAIL_TEMPLATES.CUSTOM.subject,
  );
  const [body, setBody] = useState(DEFAULT_EMAIL_TEMPLATES.CUSTOM.body);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setType("CUSTOM");
      setSubject(DEFAULT_EMAIL_TEMPLATES.CUSTOM.subject);
      setBody(DEFAULT_EMAIL_TEMPLATES.CUSTOM.body);
      setEnabled(true);
    }
  }, [isOpen]);

  const handleInsertVariable = (varKey: string) => {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((prev) => `${prev} ${varKey}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setBody(body.substring(0, start) + varKey + body.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || isSubmitting) return;
    await onSubmit({
      name: name.trim(),
      type,
      subject: subject.trim(),
      body,
      enabled,
    });
  };

  const modalTitle = (
    <span className="inline-flex items-center gap-2">
      <MailPlus className="h-4 w-4 text-blue-600" />
      <span>{t("email.createModalTitle")}</span>
    </span>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={modalTitle}
      size="md"
      contentClassName="flex flex-col min-h-0 bg-[#fbfbfd] dark:bg-[#1a1a1a]"
    >
      <form
        id="create-email-template-form"
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="new-template-name"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {t("email.templateTitleLabel")}
              </label>
              <Input
                id="new-template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("email.templateTitlePlaceholder")}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-template-category"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {t("email.templateCategoryLabel")}
              </label>
              <CustomSelect
                id="new-template-category"
                size="sm"
                value={type}
                onChange={(val) => setType(val as EmailTemplateType)}
                options={getEmailTemplateTypeOptions(t)}
                className="w-full"
                triggerClassName="h-9 text-xs"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {t("email.templateEnabledLabel")}
            </span>
          </label>

          <div className="space-y-1.5">
            <label
              htmlFor="new-template-subject"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {t("email.subject")}
            </label>
            <Input
              id="new-template-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("email.subjectPlaceholder")}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-template-body"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {t("email.body")}
            </label>
            <textarea
              id="new-template-body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder={t("email.bodyPlaceholder")}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <span>{t("email.insertVariableHint")}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.key)}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                  title={t(v.labelKey as TranslationKey) || v.label}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#202020] shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!name.trim() || !subject.trim() || isSubmitting}
            className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{t("email.newTemplateBtn")}</span>
          </Button>
        </div>
      </form>
    </CustomModal>
  );
}
