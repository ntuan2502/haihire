"use client";

import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, Trash2, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

export interface ConfirmDestructiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: ReactNode;
  /**
   * Target text that the user must type to confirm.
   * If omitted, confirmation does not require typing.
   */
  confirmMatchText?: string;
  confirmMatchLabel?: ReactNode;
  confirmPlaceholder?: string;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning";
  notice?: ReactNode;
}

export function ConfirmDestructiveModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmMatchText,
  confirmMatchLabel,
  confirmPlaceholder,
  confirmButtonLabel,
  cancelButtonLabel,
  isLoading = false,
  variant = "danger",
  notice,
}: ConfirmDestructiveModalProps) {
  const { t } = useI18n();
  const [inputText, setInputText] = useState("");
  const [hasCopied, setHasCopied] = useState(false);

  // Reset input when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setInputText("");
      setHasCopied(false);
    }
  }, [isOpen]);

  const targetText = confirmMatchText?.trim() || "";
  const isMatchRequired = targetText.length > 0;
  const isMatchValid = !isMatchRequired || inputText.trim() === targetText;
  const canSubmit = isMatchValid && !isLoading;

  const handleCopyTarget = async () => {
    if (!targetText) return;
    try {
      await navigator.clipboard.writeText(targetText);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onConfirm();
    }
  };

  const isDanger = variant === "danger";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md p-6 gap-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="gap-3 text-left">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isDanger
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40"
                }`}
              >
                {isDanger ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Optional Notice Block */}
          {notice && (
            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800">
              {notice}
            </div>
          )}

          {/* Confirmation Text Input Requirement */}
          {isMatchRequired && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="confirm-destructive-input" className="text-slate-700 dark:text-slate-300 font-medium">
                  {confirmMatchLabel || t("common.confirmInputInstruction", { matchText: targetText })}
                </label>
                <button
                  type="button"
                  onClick={handleCopyTarget}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
                  title={t("common.copyKeyword")}
                >
                  {hasCopied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">{t("common.copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>{t("common.copy")}</span>
                    </>
                  )}
                </button>
              </div>

              <Input
                id="confirm-destructive-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={confirmPlaceholder || t("common.confirmInputPlaceholder", { matchText: targetText })}
                disabled={isLoading}
                autoComplete="off"
                className={`h-9 text-xs transition-all ${
                  inputText.length > 0 && !isMatchValid
                    ? "border-rose-400 focus-visible:ring-rose-500/30"
                    : isMatchValid && inputText.length > 0
                    ? "border-emerald-500 focus-visible:ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20"
                    : ""
                }`}
              />
            </div>
          )}

          {/* Action Buttons using standard Shadcn DialogFooter */}
          <DialogFooter className="flex items-center justify-end gap-2.5 pt-3 sm:justify-end -mx-0 -mb-0 bg-transparent border-t border-slate-100 dark:border-slate-800/80 p-0">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClose}
              className="h-9 px-4 rounded-lg border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer"
            >
              {cancelButtonLabel || t("common.cancel")}
            </Button>

            <Button
              type="submit"
              disabled={!canSubmit}
              className={`h-9 px-4 rounded-lg text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDanger
                  ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/30"
                  : "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500/30"
              }`}
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>
                {isLoading
                  ? t("common.loading")
                  : confirmButtonLabel || (isDanger ? t("common.delete") : t("common.confirm"))}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
