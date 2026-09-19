"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "cn";

export interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  className?: string;
  panelClassName?: string;
}

export function SlideOver({
  isOpen,
  onClose,
  children,
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <aside
          className={cn(
            "w-screen pointer-events-auto bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-slate-800 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300 ease-out",
            maxWidth,
            panelClassName
          )}
        >
          {children}
        </aside>
      </div>
    </div>
  );
}
