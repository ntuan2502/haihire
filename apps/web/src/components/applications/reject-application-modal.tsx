"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { UserX } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FormModal } from "@/components/shared";
import { FlowEmailToggleField } from "@/components/email/flow-email-toggle-field";
import { useFlowTemplateSelection } from "@/components/email/flow-template-selector";
import { useI18n } from "@/i18n";
import { normalizeEmailAddress } from "@/lib/utils";

export interface RejectApplicationConfirmPayload {
  rejectionReason?: string;
  sendRejectionEmail: boolean;
  emailTemplateId?: string;
}

export interface RejectApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: RejectApplicationConfirmPayload) => Promise<void> | void;
  candidateName: string;
  candidateEmail?: string | null;
  jobTitle: string;
  isSubmitting?: boolean;
}

/**
 * Confirmation modal shown before transitioning an application to REJECTED.
 * Prevents accidental Kanban drags from firing rejection emails automatically
 * and captures an optional rejection reason.
 */
export function RejectApplicationModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  candidateEmail,
  jobTitle,
  isSubmitting = false,
}: RejectApplicationModalProps) {
  const { t } = useI18n();
  const reasonId = useId();
  const { canViewEmail, activeTemplates, defaultTemplateId } =
    useFlowTemplateSelection("APPLICATION_REJECTED", isOpen);

  const [rejectionReason, setRejectionReason] = useState("");
  const [sendRejectionEmail, setSendRejectionEmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const hasTouchedTemplateRef = useRef(false);

  const normalizedEmail = normalizeEmailAddress(candidateEmail);
  const hasEmail = normalizedEmail.length > 0;

  useEffect(() => {
    if (!isOpen) {
      hasTouchedTemplateRef.current = false;
      setRejectionReason("");
      setSendRejectionEmail(false);
      setSelectedTemplateId("");
      return;
    }
    if (!hasTouchedTemplateRef.current) {
      setSelectedTemplateId(defaultTemplateId);
    }
  }, [isOpen, defaultTemplateId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const trimmedReason = rejectionReason.trim();
    const effectiveSend = hasEmail ? sendRejectionEmail : false;
    const effectiveTemplateId =
      effectiveSend && canViewEmail && selectedTemplateId
        ? selectedTemplateId
        : undefined;
    await onConfirm({
      rejectionReason: trimmedReason || undefined,
      sendRejectionEmail: effectiveSend,
      ...(effectiveTemplateId ? { emailTemplateId: effectiveTemplateId } : {}),
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t("applications.rejectModal.title")}
      description={t("applications.rejectModal.description", {
        name: candidateName,
        job: jobTitle,
      })}
      icon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
          <UserX className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      size="sm"
      showCloseButton={false}
      isSubmitting={isSubmitting}
      submitLabel={t("applications.rejectModal.confirmButton")}
      submitVariant="destructive"
      cancelLabel={t("common.cancel")}
      bodyClassName="py-4 space-y-4"
    >
      <div className="space-y-1.5">
        <label
          htmlFor={reasonId}
          className="text-xs font-medium text-foreground block"
        >
          {t("applications.rejectModal.reasonLabel")}
        </label>
        <Textarea
          id={reasonId}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          maxLength={1000}
          rows={3}
          disabled={isSubmitting}
          placeholder={t("applications.rejectModal.reasonPlaceholder")}
          className="text-xs resize-none focus-visible:ring-rose-500"
        />
      </div>

      <FlowEmailToggleField
        hasEmail={hasEmail}
        checked={sendRejectionEmail}
        onCheckedChange={setSendRejectionEmail}
        sendLabel={t("applications.rejectModal.sendEmailLabel", {
          email: normalizedEmail,
        })}
        noEmailHint={t("applications.rejectModal.noEmailHint")}
        canSelectTemplate={canViewEmail}
        templateSelectId="reject-email-template-select"
        templateLabel={t("applications.rejectModal.selectTemplateLabel")}
        templateValue={selectedTemplateId}
        onTemplateChange={(val) => {
          hasTouchedTemplateRef.current = true;
          setSelectedTemplateId(val);
        }}
        activeTemplates={activeTemplates}
        disabled={isSubmitting}
        accent="destructive"
      />
    </FormModal>
  );
}
