"use client";

import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import {
  Award,
  Calendar,
  Copy,
  Eye,
  FileText,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  DEFAULT_EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  getEmailFlowTitle,
  getEmailTemplateTypeLabel,
  getEmailTemplateTypeOptions,
  interpolateTemplate,
  type EmailFlowKey,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/lib/email-templates";
import { useI18n, type TranslationKey } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useCreateEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
  useDuplicateEmailTemplateMutation,
  useEmailFlows,
  useEmailSettings,
  useEmailTemplates,
  useUpdateEmailFlowMutation,
  useUpdateEmailTemplateMutation,
} from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDestructiveModal, CustomSelect } from "@/components/shared";
import { EmailFlowsCard } from "@/components/email/email-flows-card";
import { EmailPreviewModal } from "@/components/email/email-preview-modal";
import {
  EmailTemplateCreateModal,
  type EmailTemplateCreatePayload,
} from "@/components/email/email-template-create-modal";
import { cn } from "cn";

const TEMPLATE_ICONS: Record<EmailTemplateType, ElementType> = {
  APPLICATION_CONFIRMATION: FileText,
  INTERVIEW_INVITATION: Calendar,
  REJECTION: UserCheck,
  OFFER: Award,
  CUSTOM: Mail,
};

export default function EmailTemplatesSettingsPage() {
  const { t } = useI18n();
  const canManageTemplates = useHasPermission("email:manage_templates");

  const { data: remoteTemplates = [] } = useEmailTemplates();
  const { data: remoteFlows = [] } = useEmailFlows();
  const { data: remoteSettings } = useEmailSettings();

  const createTemplateMutation = useCreateEmailTemplateMutation();
  const updateTemplateMutation = useUpdateEmailTemplateMutation();
  const duplicateTemplateMutation = useDuplicateEmailTemplateMutation();
  const deleteTemplateMutation = useDeleteEmailTemplateMutation();
  const updateFlowMutation = useUpdateEmailFlowMutation();

  const templates: EmailTemplate[] = useMemo(() => {
    if (remoteTemplates.length > 0) return remoteTemplates;
    return Object.values(DEFAULT_EMAIL_TEMPLATES);
  }, [remoteTemplates]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    if (type === "success") {
      toast.success(text);
    } else {
      toast.error(text);
    }
  };

  // Select initial template and keep selection valid across list updates
  useEffect(() => {
    if (templates.length === 0) return;
    const current = templates.find((tpl) => tpl.id === selectedId);
    if (!current) {
      const first = templates[0];
      setSelectedId(first.id);
      setDraft({ ...first });
      return;
    }
    if (!draft || draft.id !== current.id) {
      setDraft({ ...current });
    }
  }, [templates, selectedId, draft]);

  const handleSelectTemplate = (tpl: EmailTemplate) => {
    setSelectedId(tpl.id);
    setDraft({ ...tpl });
  };

  const activeTemplate = draft ?? templates[0];

  const flowAssignmentsByTemplateId = useMemo(() => {
    const map = new Map<string, EmailFlowKey[]>();
    for (const flow of remoteFlows) {
      if (!flow.templateId) continue;
      const list = map.get(flow.templateId) ?? [];
      list.push(flow.flowKey);
      map.set(flow.templateId, list);
    }
    return map;
  }, [remoteFlows]);

  const senderName = remoteSettings?.fromName || t("email.defaultSenderName");
  const senderEmail = remoteSettings?.fromEmail || "careers@nexus.com";

  const sampleVariables = useMemo(
    () => ({
      candidate_name: t("email.sampleCandidateName"),
      candidate_email: "an.nguyen@example.com",
      job_title: "Senior Frontend Engineer",
      company_name: "Nexus Corporation",
      interview_date: "22/09/2026",
      interview_time: "14:30",
      interview_format: "Google Meet",
      interview_link: "https://meet.google.com/xyz-abcd-efg",
      interviewer_name: t("email.sampleInterviewerName"),
      sender_name: senderName,
    }),
    [senderName, t],
  );

  const previewSubject = useMemo(
    () =>
      activeTemplate
        ? interpolateTemplate(activeTemplate.subject, sampleVariables)
        : "",
    [activeTemplate, sampleVariables],
  );

  const previewBody = useMemo(
    () =>
      activeTemplate
        ? interpolateTemplate(activeTemplate.body, sampleVariables)
        : "",
    [activeTemplate, sampleVariables],
  );

  const handleInsertVariable = (varKey: string) => {
    if (!activeTemplate) return;
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setDraft((prev) =>
        prev ? { ...prev, body: `${prev.body} ${varKey}` } : prev,
      );
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody =
      activeTemplate.body.substring(0, start) +
      varKey +
      activeTemplate.body.substring(end);
    setDraft((prev) => (prev ? { ...prev, body: nextBody } : prev));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleUpdateFlow = async (
    flowKey: EmailFlowKey,
    data: { templateId?: string | null; enabled?: boolean },
  ) => {
    try {
      await updateFlowMutation.mutateAsync({ flowKey, data });
      showFeedback("success", t("email.flowSavedSuccess"));
    } catch (err: unknown) {
      showFeedback("error", getApiErrorMessage(err, t));
    }
  };

  const handleCreateTemplate = async (payload: EmailTemplateCreatePayload) => {
    try {
      const created = await createTemplateMutation.mutateAsync(payload);
      setSelectedId(created.id);
      setDraft({ ...created });
      setIsCreateModalOpen(false);
      showFeedback("success", t("email.createSuccess"));
    } catch (err: unknown) {
      showFeedback("error", getApiErrorMessage(err, t));
    }
  };

  const handleSaveTemplate = async () => {
    if (!activeTemplate || !canManageTemplates) return;
    try {
      const updated = await updateTemplateMutation.mutateAsync({
        type: activeTemplate.id,
        data: {
          name: activeTemplate.name.trim(),
          type: activeTemplate.type,
          subject: activeTemplate.subject.trim(),
          body: activeTemplate.body,
          enabled: Boolean(activeTemplate.enabled),
        },
      });
      setDraft({ ...updated });
      showFeedback("success", t("email.templateSavedSuccess"));
    } catch (err: unknown) {
      showFeedback(
        "error",
        getApiErrorMessage(err, t, "email.templateSaveError"),
      );
    }
  };

  const handleDuplicateTemplate = async (tpl: EmailTemplate) => {
    if (!canManageTemplates) return;
    try {
      const created = await duplicateTemplateMutation.mutateAsync({
        id: tpl.id,
        name: `${tpl.name} (${t("email.copySuffix")})`,
      });
      setSelectedId(created.id);
      setDraft({ ...created });
      showFeedback("success", t("email.duplicateSuccess"));
    } catch (err: unknown) {
      showFeedback("error", getApiErrorMessage(err, t));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplateMutation.mutateAsync(deleteTarget.id);
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      if (selectedId === deletedId) {
        const remaining = templates.filter((tpl) => tpl.id !== deletedId);
        if (remaining[0]) {
          setSelectedId(remaining[0].id);
          setDraft({ ...remaining[0] });
        }
      }
      showFeedback("success", t("email.deleteSuccess"));
    } catch (err: unknown) {
      showFeedback("error", getApiErrorMessage(err, t));
    }
  };

  const handleResetDefault = () => {
    if (!activeTemplate) return;
    const def = DEFAULT_EMAIL_TEMPLATES[activeTemplate.type];
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            name: def.name,
            subject: def.subject,
            body: def.body,
          }
        : prev,
    );
    showFeedback("success", t("email.templateResetSuccess"));
  };

  const deleteTargetFlows = deleteTarget
    ? (flowAssignmentsByTemplateId.get(deleteTarget.id) ?? [])
    : [];

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Section 1: 4 Workflow Auto-Send Bindings */}
      <EmailFlowsCard
        flows={remoteFlows}
        templates={templates}
        canManage={canManageTemplates}
        isUpdating={updateFlowMutation.isPending}
        onUpdateFlow={handleUpdateFlow}
      />

      {/* Section 2: Template Library + Editor */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Template Library */}
        <div className="xl:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("email.libraryTitle")}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t("email.libraryDesc")}
              </p>
            </div>
            {canManageTemplates && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8 px-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0 cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("email.newTemplateBtn")}</span>
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-0.5">
            {templates.map((tpl) => {
              const IconComp = TEMPLATE_ICONS[tpl.type] || Mail;
              const isSelected = activeTemplate?.id === tpl.id;
              const assignedFlows =
                flowAssignmentsByTemplateId.get(tpl.id) ?? [];

              return (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectTemplate(tpl);
                    }
                  }}
                  className={cn(
                    "w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2",
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-1 ring-blue-600/20"
                      : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                        )}
                      >
                        <IconComp className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tpl.name}
                      </span>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                        tpl.enabled
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                          : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700",
                      )}
                    >
                      {tpl.enabled
                        ? t("email.statusEnabled")
                        : t("email.statusDisabled")}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {tpl.subject}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                          tpl.isSystem
                            ? "bg-blue-50/70 border-blue-200/70 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300"
                            : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
                        )}
                      >
                        {tpl.isSystem
                          ? t("email.systemBadge")
                          : t("email.customBadge")}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {getEmailTemplateTypeLabel(tpl.type, t)}
                      </span>
                    </div>

                    {canManageTemplates && !tpl.id.startsWith("tpl-") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDuplicateTemplate(tpl);
                        }}
                        title={t("email.duplicateBtn")}
                        aria-label={t("email.duplicateBtn")}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer shrink-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {assignedFlows.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[10px] text-slate-400">
                        {t("email.assignedFlowsLabel")}
                      </span>
                      {assignedFlows.map((flowKey) => (
                        <span
                          key={flowKey}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        >
                          {getEmailFlowTitle(flowKey, t)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Selected Template Editor */}
        {activeTemplate && (
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
                    setDraft((prev) =>
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
                onClick={() => setIsPreviewModalOpen(true)}
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
                    setDraft((prev) =>
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
                    setDraft((prev) =>
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
                  setDraft((prev) =>
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
                  setDraft((prev) =>
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
                    onClick={() => handleInsertVariable(v.key)}
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
                    onClick={handleResetDefault}
                    disabled={
                      !canManageTemplates || updateTemplateMutation.isPending
                    }
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
                    onClick={() => setDeleteTarget(activeTemplate)}
                    disabled={deleteTemplateMutation.isPending}
                    className="h-9 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t("email.deleteBtn")}</span>
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {canManageTemplates &&
                  !activeTemplate.id.startsWith("tpl-") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void handleDuplicateTemplate(activeTemplate)
                      }
                      disabled={duplicateTemplateMutation.isPending}
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
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="h-9 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1.5 rounded-xl shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t("email.livePreview")}</span>
                </Button>

                {canManageTemplates && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={updateTemplateMutation.isPending}
                    className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>
                      {updateTemplateMutation.isPending
                        ? t("common.saving")
                        : t("email.saveTemplate")}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <EmailTemplateCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTemplate}
        isSubmitting={createTemplateMutation.isPending}
      />

      {activeTemplate && (
        <EmailPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          subject={previewSubject}
          body={previewBody}
          senderName={senderName}
          senderEmail={senderEmail}
          templateName={activeTemplate.name}
        />
      )}

      <ConfirmDestructiveModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t("email.deleteConfirmTitle")}
        description={t("email.deleteConfirmDesc", {
          name: deleteTarget?.name ?? "",
        })}
        notice={
          deleteTargetFlows.length > 0
            ? t("email.deleteConfirmAssignedWarning", {
                flows: deleteTargetFlows
                  .map((fk) => getEmailFlowTitle(fk, t))
                  .join(", "),
              })
            : undefined
        }
        confirmButtonLabel={t("email.deleteBtn")}
        isLoading={deleteTemplateMutation.isPending}
      />
    </div>
  );
}
