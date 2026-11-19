"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_EMAIL_TEMPLATES,
  getEmailFlowTitle,
  interpolateTemplate,
  type EmailFlowKey,
  type EmailTemplate,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";
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
import { ConfirmDestructiveModal } from "@/components/shared";
import { SettingsReadOnlyBanner } from "@/components/settings/settings-read-only-banner";
import { EmailFlowsCard } from "@/components/email/email-flows-card";
import { EmailPreviewModal } from "@/components/email/email-preview-modal";
import {
  EmailTemplateCreateModal,
  type EmailTemplateCreatePayload,
} from "@/components/email/email-template-create-modal";
import { EmailTemplateLibrarySidebar } from "@/components/email/email-template-library-sidebar";
import { EmailTemplateEditorPanel } from "@/components/email/email-template-editor-panel";

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
  const senderEmail = remoteSettings?.fromEmail || "careers@haihire.vn";

  const sampleVariables = useMemo(
    () => ({
      candidate_name: t("email.sampleCandidateName"),
      candidate_email: "an.nguyen@example.com",
      candidate_phone: "0912 345 678",
      job_title: "Senior Frontend Engineer",
      job_department: "Engineering",
      job_location: "Hà Nội / Remote",
      job_salary: "35,000,000 - 45,000,000 VND",
      company_name: "HaiHire",
      interview_date: "22/09/2026",
      interview_time: "14:30",
      interview_format: "Google Meet",
      interview_link: "https://meet.google.com/xyz-abcd-efg",
      interviewer_name: t("email.sampleInterviewerName"),
      sender_name: senderName,
      start_date: "01/10/2026",
      salary: "40,000,000 VND",
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
      setIsDeleteModalOpen(false);
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
      {!canManageTemplates && <SettingsReadOnlyBanner />}

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
        <EmailTemplateLibrarySidebar
          templates={templates}
          activeTemplate={activeTemplate}
          onSelectTemplate={handleSelectTemplate}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onDuplicateTemplate={handleDuplicateTemplate}
          flowAssignmentsByTemplateId={flowAssignmentsByTemplateId}
          canManageTemplates={canManageTemplates}
        />

        {activeTemplate && (
          <EmailTemplateEditorPanel
            activeTemplate={activeTemplate}
            canManageTemplates={canManageTemplates}
            onDraftChange={setDraft}
            onOpenPreview={() => setIsPreviewModalOpen(true)}
            onResetDefault={handleResetDefault}
            onDelete={() => {
              setDeleteTarget(activeTemplate);
              setIsDeleteModalOpen(true);
            }}
            onDuplicate={() => handleDuplicateTemplate(activeTemplate)}
            onSave={handleSaveTemplate}
            onInsertVariable={handleInsertVariable}
            bodyTextareaRef={bodyTextareaRef}
            isSaving={updateTemplateMutation.isPending}
            isDeleting={deleteTemplateMutation.isPending}
            isDuplicating={duplicateTemplateMutation.isPending}
          />
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
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
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
