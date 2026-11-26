"use client";

import { useState, type ReactNode } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useOptionalI18n } from "@/i18n/optional";

export type PreviewModalSize = "lg" | "xl" | "full";

export const PREVIEW_MODAL_SIZES: Record<PreviewModalSize, string> = {
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-6xl",
  full: "sm:max-w-[96vw]",
};

export interface PreviewModalContext {
  isMaximized: boolean;
}

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  headerActions?: ReactNode | ((context: PreviewModalContext) => ReactNode);
  allowMaximize?: boolean;
  size?: PreviewModalSize;
  height?: string;
  panelClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode | ((context: PreviewModalContext) => ReactNode);
}

export function PreviewModal({
  isOpen,
  onClose,
  title,
  description,
  badge,
  headerActions,
  allowMaximize = true,
  size = "xl",
  height = "h-[90dvh]",
  panelClassName,
  headerClassName,
  contentClassName,
  children,
}: PreviewModalProps) {
  const { t } = useOptionalI18n();
  const [isMaximized, setIsMaximized] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsMaximized(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "p-0 overflow-hidden flex flex-col",
          PREVIEW_MODAL_SIZES[size],
          height,
          panelClassName,
          // Keep maximize classes last so panelClassName cannot override fullscreen
          isMaximized &&
            "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-dvh max-w-none sm:max-w-none max-h-none rounded-none border-0",
        )}
      >
        <DialogHeader
          className={cn(
            "px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border bg-card flex-row items-center justify-between gap-2 sm:gap-3 flex-wrap shrink-0",
            headerClassName,
          )}
        >
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-sm sm:text-base font-semibold text-foreground leading-tight truncate">
                {title}
              </DialogTitle>
              {badge && (
                <div className="inline-flex items-center shrink-0">{badge}</div>
              )}
            </div>
            {description && (
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {description}
              </DialogDescription>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 sm:order-last">
            {allowMaximize && (
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
                aria-label={
                  isMaximized ? t("common.restore") : t("common.maximize")
                }
                title={isMaximized ? t("common.restore") : t("common.maximize")}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {headerActions && (
            <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-full w-full sm:w-auto sm:ml-auto">
              {typeof headerActions === "function"
                ? headerActions({ isMaximized })
                : headerActions}
            </div>
          )}
        </DialogHeader>

        <div
          className={cn(
            "flex-1 min-h-0 overflow-hidden flex flex-col",
            contentClassName,
          )}
        >
          {typeof children === "function"
            ? children({ isMaximized })
            : children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
