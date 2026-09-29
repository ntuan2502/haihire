"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "cn";

export type CustomModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";

export const CUSTOM_MODAL_SIZES: Record<CustomModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  full: "sm:max-w-[95vw]",
};

export interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: CustomModalSize;
  maxWidth?: string;
  className?: string;
  panelClassName?: string;
  headerClassName?: string;
  children: ReactNode;
  showCloseButton?: boolean;
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  description,
  size = "3xl",
  maxWidth,
  className,
  panelClassName,
  headerClassName,
  children,
  showCloseButton = true,
}: CustomModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedMaxWidth = maxWidth || CUSTOM_MODAL_SIZES[size] || "sm:max-w-3xl";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-0 duration-150",
        className,
      )}
    >
      {/* Backdrop with native blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Surface */}
      <div
        className={cn(
          "relative z-10 w-full max-h-[92vh] flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#fbfbfd] dark:bg-[#1a1a1a] shadow-2xl overflow-hidden duration-150 animate-in zoom-in-95",
          resolvedMaxWidth,
          panelClassName,
        )}
      >
        {/* Header (shadcn design aesthetics with zero macos decoration) */}
        {(title || description || showCloseButton) && (
          <div
            className={cn(
              "px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#202020] flex items-center justify-between shrink-0",
              headerClassName,
            )}
          >
            <div className="space-y-1 pr-6">
              {title && (
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Modal Content */}
        {children}
      </div>
    </div>
  );
}
