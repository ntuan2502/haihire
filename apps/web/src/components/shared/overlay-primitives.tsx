"use client";

import type { ComponentProps } from "react";
import { XIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { DialogClose, type DialogContent } from "@/components/ui/dialog";
import { SheetClose } from "@/components/ui/sheet";
import { useOptionalI18n } from "@/i18n/optional";

type OverlayContentProps = ComponentProps<typeof DialogContent>;

export interface OverlayDismissGuardOptions {
  disableClose?: boolean;
  onEscapeKeyDown?: OverlayContentProps["onEscapeKeyDown"];
  onPointerDownOutside?: OverlayContentProps["onPointerDownOutside"];
  onInteractOutside?: OverlayContentProps["onInteractOutside"];
  onFocusOutside?: OverlayContentProps["onFocusOutside"];
}

/**
 * Check if an outside interaction target belongs to an open CustomSelect popup portal.
 */
export function isCustomSelectInteraction(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-custom-select-popup]"));
}

/**
 * Check if any CustomSelect popup is currently mounted in the document.
 */
export function hasOpenCustomSelectPopup(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector("[data-custom-select-popup]"));
}

/**
 * Create Radix Dialog/Sheet dismiss event handlers that respect `disableClose`
 * and prevent portaled `CustomSelect` interactions from closing the enclosing overlay.
 */
export function createOverlayDismissGuard(
  options: OverlayDismissGuardOptions = {},
): Pick<
  OverlayContentProps,
  | "onEscapeKeyDown"
  | "onPointerDownOutside"
  | "onInteractOutside"
  | "onFocusOutside"
> {
  const {
    disableClose = false,
    onEscapeKeyDown,
    onPointerDownOutside,
    onInteractOutside,
    onFocusOutside,
  } = options;

  return {
    onEscapeKeyDown: (e) => {
      if (disableClose || hasOpenCustomSelectPopup()) {
        e.preventDefault();
        return;
      }
      onEscapeKeyDown?.(e);
    },
    onPointerDownOutside: (e) => {
      if (disableClose || isCustomSelectInteraction(e.target)) {
        e.preventDefault();
        return;
      }
      onPointerDownOutside?.(e);
    },
    onInteractOutside: (e) => {
      if (disableClose || isCustomSelectInteraction(e.target)) {
        e.preventDefault();
        return;
      }
      onInteractOutside?.(e);
    },
    onFocusOutside: (e) => {
      if (isCustomSelectInteraction(e.target)) {
        e.preventDefault();
        return;
      }
      onFocusOutside?.(e);
    },
  };
}

export interface OverlayCloseButtonProps {
  primitive: "dialog" | "sheet";
  disabled?: boolean;
  className?: string;
}

/**
 * Localized, accessible 32x32px close button for HaiHire Dialog and Sheet wrappers.
 */
export function OverlayCloseButton({
  primitive,
  disabled = false,
  className,
}: OverlayCloseButtonProps) {
  const { t } = useOptionalI18n();
  const ClosePrimitive = primitive === "dialog" ? DialogClose : SheetClose;

  return (
    <ClosePrimitive asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={t("common.close")}
        className={cn(
          "absolute top-3.5 right-3.5 z-10 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer disabled:pointer-events-none",
          className,
        )}
      >
        <XIcon className="size-4" aria-hidden="true" />
        <span className="sr-only">{t("common.close")}</span>
      </Button>
    </ClosePrimitive>
  );
}
