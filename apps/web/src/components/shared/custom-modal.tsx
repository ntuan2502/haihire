"use client";

import { useState, type ReactNode } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useOptionalI18n } from "@/i18n/optional";
import { cn } from "cn";

export type CustomModalSize =
  "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";

export const CUSTOM_MODAL_SIZES: Record<CustomModalSize, string> = {
  sm: "sm:max-w-md", // ~448px (Alert / Confirmation dialog)
  md: "sm:max-w-2xl", // ~672px (Standard dialog / Event lists)
  lg: "sm:max-w-4xl", // ~896px (Complex form / Scorecard / Schedule)
  xl: "sm:max-w-6xl", // ~1152px (Document Preview / Multi-column workspace)
  "2xl": "sm:max-w-6xl",
  "3xl": "sm:max-w-7xl",
  "4xl": "sm:max-w-[90vw]",
  full: "sm:max-w-[96vw]", // Full viewport workspace
};

export interface CustomModalContext {
  isMaximized: boolean;
}

export interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  headerRight?: ReactNode | ((context: CustomModalContext) => ReactNode);
  size?: CustomModalSize;
  maxWidth?: string;
  height?: string;
  className?: string;
  panelClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode | ((context: CustomModalContext) => ReactNode);
  showCloseButton?: boolean;
  allowMaximize?: boolean;
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  description,
  badge,
  headerRight,
  size = "md",
  maxWidth,
  height,
  className,
  panelClassName,
  headerClassName,
  contentClassName,
  children,
  showCloseButton = true,
  allowMaximize = false,
}: CustomModalProps) {
  const { t } = useOptionalI18n();
  const [isMaximized, setIsMaximized] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsMaximized(false);
      onClose();
    }
  };

  const resolvedMaxWidth =
    maxWidth || CUSTOM_MODAL_SIZES[size] || "sm:max-w-2xl";
  const resolvedHeight = height || "max-h-[90dvh]";
  const hasHeader = Boolean(
    title ||
    description ||
    badge ||
    headerRight ||
    showCloseButton ||
    allowMaximize,
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col",
          resolvedMaxWidth,
          resolvedHeight,
          className,
          panelClassName,
          isMaximized &&
            "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-dvh max-w-none sm:max-w-none max-h-none rounded-none border-0",
        )}
      >
        {hasHeader ? (
          <DialogHeader
            className={cn(
              "px-6 py-4 border-b border-border bg-card flex-row items-center justify-between gap-3 shrink-0 text-left",
              headerClassName,
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {title ? (
                    <DialogTitle className="text-base font-semibold text-foreground leading-tight truncate">
                      {title}
                    </DialogTitle>
                  ) : (
                    <DialogTitle className="sr-only">
                      {t("common.details")}
                    </DialogTitle>
                  )}
                  {badge && (
                    <div className="inline-flex items-center shrink-0">
                      {badge}
                    </div>
                  )}
                </div>
                {description && (
                  <DialogDescription className="text-xs text-muted-foreground">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {typeof headerRight === "function"
                ? headerRight({ isMaximized })
                : headerRight}

              {allowMaximize && (
                <button
                  type="button"
                  onClick={() => setIsMaximized((prev) => !prev)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
                  aria-label={
                    isMaximized ? t("common.restore") : t("common.maximize")
                  }
                  title={
                    isMaximized ? t("common.restore") : t("common.maximize")
                  }
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}

              {showCloseButton && (
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">{t("common.details")}</DialogTitle>
        )}

        {/* Modal Content */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto flex flex-col",
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
