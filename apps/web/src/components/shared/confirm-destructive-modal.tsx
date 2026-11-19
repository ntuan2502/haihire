"use client";

import {
  useState,
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
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

export type ConfirmModalProps = ConfirmDestructiveModalProps;

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
  const inputId = useId();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputText, setInputText] = useState("");
  const [hasCopied, setHasCopied] = useState(false);

  const targetText = confirmMatchText?.trim() || "";

  // Reset typed confirmation whenever modal closes or match target changes
  useEffect(() => {
    setInputText("");
    setHasCopied(false);
  }, [isOpen, targetText]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const isMatchRequired = targetText.length > 0;
  const isMatchValid = !isMatchRequired || inputText.trim() === targetText;
  const canSubmit = isMatchValid && !isLoading;

  const handleCopyTarget = async () => {
    if (!targetText) return;
    try {
      await navigator.clipboard.writeText(targetText);
      setHasCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setHasCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await onConfirm();
    } catch {
      // Callers surface mutation feedback cleanly without unhandled rejections
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
      <DialogContent disableClose={isLoading} className="sm:max-w-md p-6 gap-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="gap-3 pr-8 text-left">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                  isDanger
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                {isDanger ? (
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <DialogTitle className="text-base font-semibold text-foreground leading-snug">
                {title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Optional Notice Block */}
          {notice && (
            <div className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border border-border">
              {notice}
            </div>
          )}

          {/* Confirmation Text Input Requirement */}
          {isMatchRequired && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <label
                  htmlFor={inputId}
                  className="text-foreground font-medium min-w-0 break-words"
                >
                  {confirmMatchLabel ||
                    t("common.confirmInputInstruction", {
                      matchText: targetText,
                    })}
                </label>
                <button
                  type="button"
                  onClick={handleCopyTarget}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
                  title={t("common.copyKeyword")}
                >
                  {hasCopied ? (
                    <>
                      <Check
                        className="h-3 w-3 text-emerald-500"
                        aria-hidden="true"
                      />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {t("common.copied")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      <span>{t("common.copy")}</span>
                    </>
                  )}
                </button>
              </div>

              <Input
                id={inputId}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  confirmPlaceholder ||
                  t("common.confirmInputPlaceholder", { matchText: targetText })
                }
                disabled={isLoading}
                autoComplete="off"
                className={`h-9 text-xs transition-all ${
                  inputText.length > 0 && !isMatchValid
                    ? "border-destructive focus-visible:ring-destructive/30"
                    : isMatchValid && inputText.length > 0
                      ? "border-emerald-500 focus-visible:ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20"
                      : ""
                }`}
              />
            </div>
          )}

          <DialogFooter className="pt-4 mt-1 border-t border-border flex-row justify-end gap-2.5 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClose}
              className="h-9 px-4 rounded-md text-xs font-medium cursor-pointer"
            >
              {cancelButtonLabel || t("common.cancel")}
            </Button>

            <Button
              type="submit"
              variant={isDanger ? "destructive" : "default"}
              disabled={!canSubmit}
              className={`h-9 px-4 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDanger
                  ? ""
                  : "bg-amber-700 text-white hover:bg-amber-800 focus-visible:ring-amber-600/30 dark:bg-amber-600 dark:hover:bg-amber-700"
              }`}
            >
              {isLoading && (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              )}
              <span>
                {isLoading
                  ? t("common.loading")
                  : confirmButtonLabel ||
                    (isDanger ? t("common.delete") : t("common.confirm"))}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDestructiveModal as ConfirmModal };
