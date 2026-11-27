"use client";

import type { FormEvent, ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  OverlayCloseButton,
  createOverlayDismissGuard,
} from "@/components/shared/overlay-primitives";
import { useOptionalI18n } from "@/i18n/optional";

export type FormModalSize = "sm" | "md" | "lg" | "xl";

export const FORM_MODAL_SIZES: Record<FormModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => Promise<void> | void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  size?: FormModalSize;
  isSubmitting?: boolean;
  submitLabel?: string;
  savingLabel?: string;
  submitDisabled?: boolean;
  submitVariant?: "default" | "destructive" | "emerald";
  cancelLabel?: string;
  error?: string | null;
  footerLeft?: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  noValidate?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  icon,
  badge,
  size = "md",
  isSubmitting = false,
  submitLabel,
  savingLabel,
  submitDisabled = false,
  submitVariant = "default",
  cancelLabel,
  error,
  footerLeft,
  footer,
  showCloseButton = true,
  noValidate = false,
  panelClassName,
  bodyClassName,
  children,
}: FormModalProps) {
  const { t } = useOptionalI18n();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submitDisabled) return;
    await onSubmit(e);
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
      <DialogContent
        showCloseButton={false}
        {...createOverlayDismissGuard({ disableClose: isSubmitting })}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "flex flex-col gap-0 p-0 max-h-[90dvh] overflow-hidden rounded-xl bg-card text-card-foreground shadow-xl",
          FORM_MODAL_SIZES[size],
          panelClassName,
        )}
      >
        <form
          onSubmit={handleSubmit}
          noValidate={noValidate}
          className="flex flex-col flex-1 min-h-0"
        >
          <DialogHeader className="px-4 sm:px-6 py-4 pr-12 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base font-semibold text-foreground leading-snug">
                    {title}
                  </DialogTitle>
                  {badge && (
                    <div className="inline-flex items-center shrink-0">
                      {badge}
                    </div>
                  )}
                </div>
                {description && (
                  <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <div
            className={cn(
              "flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-5",
              bodyClassName,
            )}
          >
            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}
            {children}
          </div>

          <DialogFooter className="px-4 sm:px-6 py-3.5 border-t border-border bg-muted/30 shrink-0 flex-row flex-wrap items-center justify-between gap-2.5 sm:justify-between">
            {footer !== undefined ? (
              footer
            ) : (
              <>
                {footerLeft && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {footerLeft}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2.5 ml-auto w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="h-9 px-4 rounded-md text-xs font-medium cursor-pointer"
                  >
                    {cancelLabel || t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant={
                      submitVariant === "destructive"
                        ? "destructive"
                        : "default"
                    }
                    disabled={isSubmitting || submitDisabled}
                    className={cn(
                      "h-9 px-4 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                      submitVariant === "emerald" &&
                        "bg-emerald-600 hover:bg-emerald-700 text-white",
                    )}
                  >
                    {isSubmitting && (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      {isSubmitting
                        ? savingLabel || t("common.saving")
                        : submitLabel || t("common.save")}
                    </span>
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </form>
        {showCloseButton && (
          <OverlayCloseButton primitive="dialog" disabled={isSubmitting} />
        )}
      </DialogContent>
    </Dialog>
  );
}
