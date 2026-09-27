"use client";

import { Check } from "lucide-react";
import { useI18n, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface LanguageDropdownProps {
  variant?: "landing" | "default";
  direction?: "up" | "down";
  className?: string;
}

export function LanguageDropdown({
  direction = "down",
  className,
}: LanguageDropdownProps) {
  const { locale, setLocale } = useI18n();
  const current = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES.vi;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 outline-none select-none bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200",
          className
        )}
        title={current.label}
        aria-label={current.label}
      >
        <span
          className="text-base leading-none select-none"
          role="img"
          aria-label={current.label}
        >
          {current.flag}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side={direction === "up" ? "top" : "bottom"}
        sideOffset={8}
        className="w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl p-1.5 text-slate-800 dark:text-slate-200"
      >
        {(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]).map((locKey) => {
          const isSelected = locKey === locale;
          const loc = SUPPORTED_LOCALES[locKey];
          return (
            <DropdownMenuItem
              key={locKey}
              onClick={() => setLocale(locKey)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer outline-none",
                isSelected
                  ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{loc.flag}</span>
                <span>{loc.label}</span>
              </div>
              {isSelected && (
                <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
