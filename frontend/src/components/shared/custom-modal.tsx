"use client";

import { useState, useEffect, type ReactNode } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "cn";

export type CustomModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";

export const CUSTOM_MODAL_SIZES: Record<CustomModalSize, string> = {
  sm: "sm:max-w-md",       // ~448px (Alert / Confirmation dialog)
  md: "sm:max-w-2xl",      // ~672px (Standard dialog / Event lists)
  lg: "sm:max-w-4xl",      // ~896px (Complex form / Scorecard / Schedule)
  xl: "sm:max-w-6xl",      // ~1152px (Document Preview / Multi-column workspace)
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
  const [isMaximized, setIsMaximized] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resolvedMaxWidth = maxWidth || CUSTOM_MODAL_SIZES[size] || "sm:max-w-2xl";
  const resolvedHeight = height || "max-h-[92vh]";

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
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Surface */}
      <div
        className={cn(
          "relative z-10 w-full flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#fbfbfd] dark:bg-[#1a1a1a] shadow-2xl overflow-hidden duration-150 animate-in zoom-in-95",
          isMaximized
            ? "w-full h-full max-w-none max-h-none rounded-none fixed inset-0 z-50"
            : cn(resolvedMaxWidth, resolvedHeight),
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (shadcn design aesthetics with zero macos decoration) */}
        {(title || description || badge || headerRight || showCloseButton || allowMaximize) && (
          <div
            className={cn(
              "px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#202020] flex items-center justify-between gap-3 shrink-0",
              headerClassName,
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {title && (
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {title}
                    </h2>
                  )}
                  {badge && (
                    <div className="inline-flex items-center shrink-0">
                      {badge}
                    </div>
                  )}
                </div>
                {description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {typeof headerRight === "function"
                ? headerRight({ isMaximized })
                : headerRight}

              {allowMaximize && (
                <button
                  type="button"
                  onClick={() => setIsMaximized((prev) => !prev)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label={isMaximized ? "Restore" : "Maximize"}
                  title={isMaximized ? "Restore" : "Maximize"}
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              )}

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
          </div>
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
      </div>
    </div>
  );
}
