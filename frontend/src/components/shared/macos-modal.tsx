"use client";

import { useState, useEffect, type ReactNode } from "react";
import { cn } from "cn";
import { useI18n } from "@/i18n";

export interface MacOsModalContext {
  isMaximized: boolean;
}

export interface MacOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  badge?: ReactNode;
  headerRight?: ReactNode | ((context: MacOsModalContext) => ReactNode);
  maxWidth?: string;
  height?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode | ((context: MacOsModalContext) => ReactNode);
}

export function MacOsModal({
  isOpen,
  onClose,
  title,
  badge,
  headerRight,
  maxWidth = "max-w-5xl",
  height = "h-[88vh]",
  className,
  contentClassName,
  children,
}: MacOsModalProps) {
  const { t } = useI18n();
  const [isMaximized, setIsMaximized] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-white dark:bg-[#1e1e1e] flex flex-col shadow-[0_30px_90px_rgba(0,0,0,0.35)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.7)] border border-black/10 dark:border-white/10 transition-[width,height,border-radius] duration-200 animate-in zoom-in-95 overflow-hidden",
          isMaximized
            ? "w-full h-full rounded-none"
            : cn("w-full", maxWidth, height, "rounded-[16px]"),
          className
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= macOS Authentic Titlebar (48px) ================= */}
        <div className="h-12 px-4 sm:px-5 bg-[#f6f6f6]/95 dark:bg-[#282828]/95 backdrop-blur-xl border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 select-none relative">
          {/* macOS Window Controls (Traffic Lights) */}
          <div className="flex items-center gap-2 group/traffic z-10">
            {/* Close Button (Red) */}
            <button
              type="button"
              onClick={onClose}
              className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center cursor-pointer transition-all active:brightness-75 shadow-2xs"
              title={t("common.close")}
            >
              <svg
                viewBox="0 0 12 12"
                className="w-2.5 h-2.5 text-[#400000] opacity-80 group-hover/traffic:opacity-100 transition-opacity"
              >
                <path
                  d="M3.2 3.2L8.8 8.8M8.8 3.2L3.2 8.8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Minimize Button (Yellow) */}
            <button
              type="button"
              onClick={onClose}
              className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center cursor-pointer transition-all active:brightness-75 shadow-2xs"
              title={t("common.close")}
            >
              <svg
                viewBox="0 0 12 12"
                className="w-2.5 h-2.5 text-[#523500] opacity-80 group-hover/traffic:opacity-100 transition-opacity"
              >
                <path
                  d="M2.5 6h7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Maximize Button (Green) */}
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border border-[#1aab29] flex items-center justify-center cursor-pointer transition-all active:brightness-75 shadow-2xs"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <svg
                viewBox="0 0 12 12"
                className="w-2.5 h-2.5 text-[#003300] opacity-80 group-hover/traffic:opacity-100 transition-opacity"
              >
                {isMaximized ? (
                  <>
                    {/* Inward triangles to restore */}
                    <path d="M2.2 2.2H6.2L2.2 6.2Z" fill="currentColor" />
                    <path d="M9.8 9.8H5.8L9.8 5.8Z" fill="currentColor" />
                  </>
                ) : (
                  <>
                    {/* Outward opposing triangles matching macOS fullscreen icon */}
                    <path d="M5.8 2.2H9.8V6.2L5.8 2.2Z" fill="currentColor" />
                    <path d="M2.2 5.8V9.8H6.2L2.2 5.8Z" fill="currentColor" />
                  </>
                )}
              </svg>
            </button>
          </div>

          {/* Center Window Title / Address Bar Capsule */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-20">
            {title && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 text-[12px] font-semibold text-slate-800 dark:text-slate-200 tracking-tight truncate shadow-2xs max-w-sm sm:max-w-md">
                <span className="truncate">{title}</span>
                {badge && (
                  <div className="hidden sm:inline-flex items-center shrink-0">
                    {badge}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Custom Slot (Segmented Control) */}
          {headerRight && (
            <div className="z-10">
              {typeof headerRight === "function" ? headerRight({ isMaximized }) : headerRight}
            </div>
          )}
        </div>

        {/* Modal Body Container */}
        <div className={cn("flex-1 overflow-hidden flex flex-col", contentClassName)}>
          {typeof children === "function" ? children({ isMaximized }) : children}
        </div>
      </div>
    </div>
  );
}
