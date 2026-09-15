"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useI18n, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n";
import { cn } from "@/lib/utils";

interface LanguageDropdownProps {
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
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          "flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 outline-none select-none",
          isLanding
            ? "bg-white/10 hover:bg-white/15 border border-white/10 text-cyan-200 shadow-sm"
            : "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        )}
        title={t("nav.language") || "Switch language"}
        aria-expanded={isOpen}
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span className={cn(isLanding ? "hidden sm:inline" : "inline font-medium")}>
          {current.label}
        </span>
        {isLanding && <span className="sm:hidden uppercase">{current.shortLabel}</span>}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 shrink-0",
            isLanding ? "text-cyan-300/80" : "text-slate-400 dark:text-slate-400",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-44 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 border",
            isLanding
              ? "bg-[#0b152d]/95 backdrop-blur-xl border-white/15 text-white"
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
                      ? "bg-blue-600/30 text-cyan-300 font-bold border border-blue-400/20 shadow-xs"
                      : "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                    : isLanding
                    ? "text-slate-300 hover:bg-white/10 hover:text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{loc.flag}</span>
                  <span>{loc.label}</span>
                </div>
                {isSelected && (
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
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
