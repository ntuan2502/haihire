"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ThemeToggleProps {
  variant?: "landing" | "default";
  direction?: "up" | "down";
  className?: string;
}

export function ThemeToggle({
  direction = "down",
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          aria-label={t("theme.toggleTheme")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold opacity-60 pointer-events-none select-none bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200",
            className
          )}
        >
          <Sun className="h-4 w-4 text-amber-500" />
        </button>
      </div>
    );
  }

  const currentOption =
    THEME_OPTIONS.find((opt) => opt.id === theme) || THEME_OPTIONS[2];
  const CurrentIcon = currentOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 outline-none select-none bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200",
          className
        )}
        title={t("theme.toggleTheme")}
        aria-label={t("theme.toggleTheme")}
      >
        <CurrentIcon className={cn("h-4 w-4", currentOption.iconColor)} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side={direction === "up" ? "top" : "bottom"}
        sideOffset={8}
        className="w-40 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl p-1.5 text-slate-800 dark:text-slate-200"
      >
        {THEME_OPTIONS.map((opt) => {
          const isSelected = opt.id === theme;
          const Icon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer outline-none",
                isSelected
                  ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5", opt.iconColor)} />
                <span>{opt.label}</span>
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
