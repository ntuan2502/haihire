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
  size?: "sm" | "md";
  variant?: "landing" | "default";
  direction?: "up" | "down";
  className?: string;
}

export function ThemeToggle({
  size = "md",
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
    },
    {
      id: "dark",
      label: t("theme.dark"),
      icon: Moon,
    },
    {
      id: "system",
      label: t("theme.system"),
      icon: Laptop,
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
            "flex items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs transition-colors outline-none select-none opacity-60 pointer-events-none",
            size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-xs",
            className,
          )}
        >
          <Sun
            className={cn(
              size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
              "text-foreground",
            )}
            aria-hidden="true"
          />
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
          "flex items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer",
          size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-xs",
          className,
        )}
        title={t("theme.toggleTheme")}
        aria-label={t("theme.toggleTheme")}
      >
        <CurrentIcon
          className={cn(
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
            "text-foreground",
          )}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side={direction === "up" ? "top" : "bottom"}
        sideOffset={8}
        className="w-40"
      >
        {THEME_OPTIONS.map((opt) => {
          const isSelected = opt.id === theme;
          const Icon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "flex items-center justify-between text-xs cursor-pointer",
                isSelected && "bg-accent text-accent-foreground font-medium",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span>{opt.label}</span>
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
