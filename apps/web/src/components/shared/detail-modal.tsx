"use client";

import type { ReactNode } from "react";
import { cn } from "cn";
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

export type DetailModalSize = "sm" | "md" | "lg" | "xl";

export const DETAIL_MODAL_SIZES: Record<DetailModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  size?: DetailModalSize;
  disableClose?: boolean;
  showCloseButton?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  children: ReactNode;
}

export function DetailModal({
  isOpen,
  onClose,
  title,
  description,
  badge,
  headerActions,
  footer,
  size = "md",
  disableClose = false,
  showCloseButton = true,
  panelClassName,
  bodyClassName,
  footerClassName,
  children,
}: DetailModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !disableClose) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        {...createOverlayDismissGuard({ disableClose })}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "flex flex-col gap-0 p-0 max-h-[90dvh] overflow-hidden rounded-xl bg-card text-card-foreground shadow-xl",
          DETAIL_MODAL_SIZES[size],
          panelClassName,
        )}
      >
        <DialogHeader className="px-4 sm:px-6 py-4 pr-12 border-b border-border bg-card flex-row items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base font-semibold text-foreground leading-snug">
                {title}
              </DialogTitle>
              {badge && (
                <div className="inline-flex items-center shrink-0">{badge}</div>
              )}
            </div>
            {description && (
              <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </div>
          {headerActions && (
            <div className="flex flex-wrap items-center gap-2 max-w-full shrink-0">
              {headerActions}
            </div>
          )}
        </DialogHeader>

        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <DialogFooter
            className={cn(
              "px-4 sm:px-6 py-3.5 border-t border-border bg-muted/30 shrink-0 flex-row flex-wrap items-center justify-end gap-2",
              footerClassName,
            )}
          >
            {footer}
          </DialogFooter>
        )}

        {showCloseButton && (
          <OverlayCloseButton primitive="dialog" disabled={disableClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
