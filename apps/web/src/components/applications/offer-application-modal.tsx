"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Award, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FlowTemplateSelect,
  useFlowTemplateSelection,
} from "@/components/email/flow-template-selector";
import { useI18n } from "@/i18n";

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

  const [sendOfferEmail, setSendOfferEmail] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const hasTouchedEmailRef = useRef(false);
  const hasTouchedTemplateRef = useRef(false);

  const normalizedEmail = candidateEmail?.trim() || "";
  const hasEmail = normalizedEmail.length > 0;

  useEffect(() => {
    if (!isOpen) {
      hasTouchedEmailRef.current = false;
      hasTouchedTemplateRef.current = false;
      setSendOfferEmail(true);
      setSelectedTemplateId("");
      return;
    }
    if (matchedFlow !== undefined && !hasTouchedEmailRef.current) {
      setSendOfferEmail(defaultSendEnabled);
    }
    if (!hasTouchedTemplateRef.current) {
      setSelectedTemplateId(defaultTemplateId);
    }
  }, [isOpen, matchedFlow, defaultSendEnabled, defaultTemplateId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const effectiveSend = hasEmail ? sendOfferEmail : false;
    const effectiveTemplateId =
      effectiveSend && selectedTemplateId ? selectedTemplateId : undefined;
    await onConfirm({
      sendOfferEmail: effectiveSend,
      ...(effectiveTemplateId ? { emailTemplateId: effectiveTemplateId } : {}),
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md p-6 gap-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                <Award className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t("applications.offerModal.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t("applications.offerModal.description", {
                name: candidateName,
                job: jobTitle,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
            {hasEmail ? (
              <>
                <label
                  htmlFor="send-offer-email-checkbox"
                  className="flex items-start gap-2.5 cursor-pointer select-none"
                >
                  <input
                    id="send-offer-email-checkbox"
                    name="sendOfferEmail"
                    type="checkbox"
                    checked={sendOfferEmail}
                    onChange={(e) => {
                      hasTouchedEmailRef.current = true;
                      setSendOfferEmail(e.target.checked);
                    }}
                    disabled={isSubmitting}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed flex items-center gap-1.5 flex-wrap">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      {t("applications.offerModal.sendEmailLabel", {
                        email: normalizedEmail,
                      })}
                    </span>
                  </span>
                </label>

                {sendOfferEmail && canViewEmail && (
                  <FlowTemplateSelect
                    selectId="offer-email-template-select"
                    label={t("applications.offerModal.selectTemplateLabel")}
                    value={selectedTemplateId}
                    onChange={(val) => {
                      hasTouchedTemplateRef.current = true;
                      setSelectedTemplateId(val);
                    }}
                    activeTemplates={activeTemplates}
                    disabled={isSubmitting}
                  />
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{t("applications.offerModal.noEmailHint")}</span>
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg h-9 px-4 text-xs font-medium cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-lg h-9 px-4 text-xs font-medium cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t("applications.offerModal.confirmButton")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
