"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { useI18n } from "@/i18n";
import { cn } from "cn";

import { Globe } from "lucide-react";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  breakpoint?: "md" | "lg";
  variant?: "landing" | "default";
  className?: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  footer,
  breakpoint = "md",
  className,
}: MobileDrawerProps) {
  const { t } = useI18n();

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
      className={cn(
        "fixed inset-x-0 top-16 bottom-0 z-40",
        breakpoint === "lg" ? "lg:hidden" : "md:hidden"
      )}
    >
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      {/* Top-Down Dropdown Menu Container */}
      <div
        className={cn(
          "relative w-full max-h-[calc(100vh-4rem)] overflow-y-auto bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in duration-150 z-10 flex flex-col justify-between",
          className
        )}
      >
        {/* Navigation List Items */}
        <div className="px-3 py-2 space-y-1">
          {children}
        </div>

        {/* Unified Mobile Theme & Language Section - Symmetrically centered between two full-width border lines */}
        <div
          className={cn(
            "border-t border-slate-200/80 dark:border-slate-800/80 px-3 py-2",
            !footer && "border-b"
          )}
        >
          <div className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                {t("nav.theme")} / {t("nav.language")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeToggle size="sm" />
              <LanguageDropdown size="sm" />
            </div>
          </div>
        </div>

        {/* Unified Bottom Actions Footer Bar */}
        {footer && (
          <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
