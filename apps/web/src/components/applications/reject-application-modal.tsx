"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

export interface RejectApplicationConfirmPayload {
  rejectionReason?: string;
  sendRejectionEmail: boolean;
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
  const [rejectionReason, setRejectionReason] = useState("");
  const [sendRejectionEmail, setSendRejectionEmail] = useState(false);

  const normalizedEmail = candidateEmail?.trim() || "";
  const hasEmail = normalizedEmail.length > 0;

  useEffect(() => {
    if (!isOpen) {
      setRejectionReason("");
      setSendRejectionEmail(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const trimmedReason = rejectionReason.trim();
    await onConfirm({
      rejectionReason: trimmedReason || undefined,
      sendRejectionEmail: hasEmail ? sendRejectionEmail : false,
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                <UserX className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t("applications.rejectModal.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t("applications.rejectModal.description", {
                name: candidateName,
                job: jobTitle,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="rejection-reason-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {t("applications.rejectModal.reasonLabel")}
            </label>
            <textarea
              id="rejection-reason-input"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={1000}
              rows={3}
              disabled={isSubmitting}
              placeholder={t("applications.rejectModal.reasonPlaceholder")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 disabled:opacity-50 resize-none"
            />
          </div>

          <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
            {hasEmail ? (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendRejectionEmail}
                  onChange={(e) => setSendRejectionEmail(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed flex items-center gap-1.5 flex-wrap">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    {t("applications.rejectModal.sendEmailLabel", {
                      email: normalizedEmail,
                    })}
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{t("applications.rejectModal.noEmailHint")}</span>
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
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              className="rounded-lg h-9 px-4 text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t("applications.rejectModal.confirmButton")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
