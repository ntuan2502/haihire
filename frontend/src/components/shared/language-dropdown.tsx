"use client";

import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { useI18n, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n";
import { cn } from "cn";

export interface LanguageDropdownProps {
  variant?: "landing" | "default";
  className?: string;
}

export function LanguageDropdown({
  variant = "default",
  className,
}: LanguageDropdownProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const current = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES.en;
  const isLanding = variant === "landing";

  return (
    <div
      className={cn("relative", className)}
      ref={dropdownRef}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 outline-none select-none",
          isLanding
            ? "bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-300/80 dark:border-white/10 text-slate-700 dark:text-cyan-200 shadow-sm"
            : "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        )}
        title={t("nav.language") || "Switch language"}
        aria-label={t("nav.language") || "Switch language"}
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none select-none" role="img" aria-label={current.label}>
          {current.flag}
        </span>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-44 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 border",
            isLanding
              ? "bg-white dark:bg-[#0b152d]/95 backdrop-blur-xl border-slate-200 dark:border-white/15 text-slate-800 dark:text-white"
              : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xl"
          )}
        >
          {(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]).map((locKey) => {
            const isSelected = locKey === locale;
            const loc = SUPPORTED_LOCALES[locKey];
            return (
              <button
                key={locKey}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocale(locKey);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer",
                  isSelected
                    ? isLanding
                      ? "bg-blue-50 dark:bg-blue-600/30 text-blue-600 dark:text-cyan-300 font-bold border border-blue-200 dark:border-blue-400/20 shadow-xs"
                      : "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                    : isLanding
                    ? "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{loc.flag}</span>
                  <span>{loc.label}</span>
                </div>
                {isSelected && (
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      isLanding ? "text-cyan-300" : "text-blue-600 dark:text-blue-400"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
