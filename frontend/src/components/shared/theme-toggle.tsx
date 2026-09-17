"use client";

import React, { useState, useRef, useEffect } from "react";
import { Moon, Sun, Laptop, ChevronDown, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n";
import { cn } from "cn";

export interface ThemeToggleProps {
  variant?: "landing" | "default";
  className?: string;
}

export function ThemeToggle({
  variant = "default",
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const isLanding = variant === "landing";

  const THEME_OPTIONS = [
    {
      id: "light",
      label: t("theme.light"),
      icon: Sun,
      iconColor: "text-amber-500",
    },
    {
      id: "dark",
      label: t("theme.dark"),
      icon: Moon,
      iconColor: "text-indigo-400",
    },
    {
      id: "system",
      label: t("theme.system"),
      icon: Laptop,
      iconColor: "text-blue-500 dark:text-blue-400",
    },
  ];

  if (!mounted) {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          disabled
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold opacity-60 pointer-events-none select-none",
            isLanding
              ? "bg-white/10 border border-white/10 text-cyan-200 shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          )}
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium">{t("theme.light")}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  const currentOption =
    THEME_OPTIONS.find((opt) => opt.id === theme) || THEME_OPTIONS[2];
  const CurrentIcon = currentOption.icon;

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
        title={t("theme.toggleTheme")}
        aria-expanded={isOpen}
      >
        <CurrentIcon className={cn("h-3.5 w-3.5", currentOption.iconColor)} />
        <span className={cn(isLanding ? "hidden sm:inline" : "inline font-medium")}>
          {currentOption.label}
        </span>
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
            "absolute right-0 mt-2 w-40 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 border",
            isLanding
              ? "bg-[#0b152d]/95 backdrop-blur-xl border-white/15 text-white"
              : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xl"
          )}
        >
          {THEME_OPTIONS.map((opt) => {
            const isSelected = opt.id === theme;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTheme(opt.id);
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
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-3.5 w-3.5", opt.iconColor)} />
                  <span>{opt.label}</span>
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
