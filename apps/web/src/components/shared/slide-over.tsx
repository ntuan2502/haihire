"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "cn";
import { useOptionalI18n } from "@/i18n/optional";

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
  const { t } = useOptionalI18n();

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
        aria-label={t("common.close")}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
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
            "w-screen pointer-events-auto bg-card text-card-foreground shadow-2xl border-l border-border flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300 ease-out",
            width || maxWidth,
            panelClassName,
          )}
        >
          {title && (
            <div className="p-6 border-b border-border flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
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
