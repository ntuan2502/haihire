"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Award } from "lucide-react";
import { FormModal } from "@/components/shared";
import { FlowEmailToggleField } from "@/components/email/flow-email-toggle-field";
import { useFlowTemplateSelection } from "@/components/email/flow-template-selector";
import { useI18n } from "@/i18n";
import { normalizeEmailAddress } from "@/lib/utils";

export interface OfferApplicationConfirmPayload {
  sendOfferEmail: boolean;
  emailTemplateId?: string;
}

export interface OfferApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: OfferApplicationConfirmPayload) => Promise<void> | void;
  candidateName: string;
  candidateEmail?: string | null;
  jobTitle: string;
  isSubmitting?: boolean;
}

/**
 * Confirmation modal shown before moving an application into the OFFER stage.
 * Prevents accidental Kanban drags from firing offer emails and allows optional template override.
 */
export function OfferApplicationModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  candidateEmail,
  jobTitle,
  isSubmitting = false,
}: OfferApplicationModalProps) {
  const { t } = useI18n();
  const {
    canViewEmail,
    activeTemplates,
    matchedFlow,
    defaultSendEnabled,
    defaultTemplateId,
  } = useFlowTemplateSelection("APPLICATION_OFFER", isOpen);

  const [sendOfferEmail, setSendOfferEmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const hasTouchedEmailRef = useRef(false);
  const hasTouchedTemplateRef = useRef(false);

  const normalizedEmail = normalizeEmailAddress(candidateEmail);
  const hasEmail = normalizedEmail.length > 0;

  useEffect(() => {
    if (!isOpen) {
      hasTouchedEmailRef.current = false;
      hasTouchedTemplateRef.current = false;
      setSendOfferEmail(false);
      setSelectedTemplateId("");
      return;
    }
    if (!canViewEmail && !hasTouchedEmailRef.current) {
      setSendOfferEmail(false);
    } else if (matchedFlow !== undefined && !hasTouchedEmailRef.current) {
      setSendOfferEmail(defaultSendEnabled);
    }
    if (!hasTouchedTemplateRef.current) {
      setSelectedTemplateId(defaultTemplateId);
    }
  }, [
    isOpen,
    canViewEmail,
    matchedFlow,
    defaultSendEnabled,
    defaultTemplateId,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const effectiveSend = hasEmail ? sendOfferEmail : false;
    const effectiveTemplateId =
      effectiveSend && canViewEmail && selectedTemplateId
        ? selectedTemplateId
        : undefined;
    await onConfirm({
      sendOfferEmail: effectiveSend,
      ...(effectiveTemplateId ? { emailTemplateId: effectiveTemplateId } : {}),
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t("applications.offerModal.title")}
      description={t("applications.offerModal.description", {
        name: candidateName,
        job: jobTitle,
      })}
      icon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
          <Award className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      size="sm"
      showCloseButton={false}
      isSubmitting={isSubmitting}
      submitLabel={t("applications.offerModal.confirmButton")}
      submitVariant="emerald"
      cancelLabel={t("common.cancel")}
      bodyClassName="py-4 space-y-4"
    >
      <FlowEmailToggleField
        hasEmail={hasEmail}
        checked={sendOfferEmail}
        onCheckedChange={(checked) => {
          hasTouchedEmailRef.current = true;
          setSendOfferEmail(checked);
        }}
        sendLabel={t("applications.offerModal.sendEmailLabel", {
          email: normalizedEmail,
        })}
        noEmailHint={t("applications.offerModal.noEmailHint")}
        canSelectTemplate={canViewEmail}
        templateSelectId="offer-email-template-select"
        templateLabel={t("applications.offerModal.selectTemplateLabel")}
        templateValue={selectedTemplateId}
        onTemplateChange={(val) => {
          hasTouchedTemplateRef.current = true;
          setSelectedTemplateId(val);
        }}
        activeTemplates={activeTemplates}
        disabled={isSubmitting}
        accent="emerald"
      />
    </FormModal>
  );
}
