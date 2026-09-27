"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { useI18n } from "@/i18n";
import { cn } from "cn";

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
          "relative w-full max-h-[calc(100vh-3.5rem)] overflow-y-auto bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-top-4 duration-200 z-10 flex flex-col justify-between",
          className
        )}
      >
        {/* Navigation List Items & Preferences */}
        <div className="px-3 py-3 space-y-0.5">
          {children}

          {/* Divider */}
          <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

          {/* Unified Mobile Theme & Language Row */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("nav.theme")} / {t("nav.language")}
            </span>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageDropdown />
            </div>
          </div>
        </div>

        {/* Unified Bottom Actions Footer Bar */}
        {footer && (
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
