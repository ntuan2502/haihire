"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "cn";

export interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  width?: string;
  maxWidth?: string;
  className?: string;
  panelClassName?: string;
}

export function SlideOver({
  isOpen,
  onClose,
  children,
  title,
  description,
  width,
  maxWidth = "max-w-2xl",
  className,
  panelClassName,
}: SlideOverProps) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn("fixed inset-0 z-50 overflow-hidden", className)}
    >
      {/* Backdrop with fade-in effect */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Close panel"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <aside
          className={cn(
            "w-screen pointer-events-auto bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-slate-800 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300 ease-out",
            width || maxWidth,
            panelClassName,
          )}
        >
          {title && (
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {title}
                </h3>
                {description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </aside>
      </div>
    </div>
  );
}
