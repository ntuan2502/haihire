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
  size?: "sm" | "md";
  direction?: "up" | "down";
  className?: string;
}

export function LanguageDropdown({
  size = "md",
  direction = "down",
  className,
}: LanguageDropdownProps) {
  const { locale, setLocale } = useI18n();
  const current = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES.vi;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer",
          size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-xs",
          className,
        )}
        title={current.label}
        aria-label={current.label}
      >
        <span
          className={cn(
            "leading-none select-none",
            size === "sm" ? "text-sm" : "text-base",
          )}
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
        className="w-44"
      >
        {(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]).map((locKey) => {
          const isSelected = locKey === locale;
          const loc = SUPPORTED_LOCALES[locKey];
          return (
            <DropdownMenuItem
              key={locKey}
              onClick={() => setLocale(locKey)}
              className={cn(
                "flex items-center justify-between text-xs cursor-pointer",
                isSelected && "bg-accent text-accent-foreground font-medium",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{loc.flag}</span>
                <span>{loc.label}</span>
              </div>
              {isSelected && (
                <Check
                  className="h-3.5 w-3.5 text-foreground"
                  aria-hidden="true"
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
