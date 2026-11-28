"use client";

import type { ReactNode } from "react";
import { cn } from "cn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  OverlayCloseButton,
  createOverlayDismissGuard,
} from "@/components/shared/overlay-primitives";
import { useOptionalI18n } from "@/i18n/optional";

export type DetailDrawerSize = "sm" | "md" | "lg" | "xl" | "2xl";

export const DETAIL_DRAWER_SIZES: Record<DetailDrawerSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
};

function resolveDrawerWidthClass(
  size?: DetailDrawerSize,
  width?: string,
  maxWidth?: string,
): string {
  const raw = width || maxWidth;
  if (raw) {
    if (raw === "max-w-sm") return "sm:max-w-sm";
    if (raw === "max-w-md") return "sm:max-w-md";
    if (raw === "max-w-lg") return "sm:max-w-lg";
    if (raw === "max-w-xl") return "sm:max-w-xl";
    if (raw === "max-w-2xl") return "sm:max-w-2xl";
    return raw;
  }
  return DETAIL_DRAWER_SIZES[size || "2xl"];
}

export interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: DetailDrawerSize;
  /** @deprecated Use `size` prop instead */
  width?: string;
  /** @deprecated Use `size` prop instead */
  maxWidth?: string;
  disableClose?: boolean;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
}

export function SlideOver({
  isOpen,
  onClose,
  children,
  title,
  description,
  size,
  width,
  maxWidth,
  disableClose = false,
  ariaLabel,
  className,
  panelClassName,
}: SlideOverProps) {
  const { t } = useOptionalI18n();
  const widthClass = resolveDrawerWidthClass(size, width, maxWidth);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !disableClose) {
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        {...createOverlayDismissGuard({ disableClose })}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "w-full p-0 gap-0 bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col h-full overflow-hidden",
          widthClass,
          className,
          panelClassName,
        )}
      >
        {title ? (
          <SheetHeader className="px-4 sm:px-6 py-4 pr-12 border-b border-border shrink-0 text-left">
            <SheetTitle className="text-sm font-semibold text-foreground">
              {title}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        ) : (
          <SheetTitle className="sr-only">
            {ariaLabel || t("common.details")}
          </SheetTitle>
        )}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
        {Boolean(title) && (
          <OverlayCloseButton primitive="sheet" disabled={disableClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}
