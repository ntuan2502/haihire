"use client";

import { useEffect, type ReactNode } from "react";
import { Globe } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/i18n";
import { cn } from "cn";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  breakpoint?: "md" | "lg";
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
    if (
      !isOpen ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const query =
      breakpoint === "lg" ? "(min-width: 1024px)" : "(min-width: 768px)";
    const mql = window.matchMedia(query);

    if (mql.matches) {
      onClose();
      return;
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        onClose();
      }
    };

    mql.addEventListener("change", handleChange);
    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, [isOpen, breakpoint, onClose]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={true}
        aria-describedby={undefined}
        className={cn(
          "w-[min(85vw,20rem)] h-dvh p-0 flex flex-col",
          breakpoint === "lg" ? "lg:hidden" : "md:hidden",
          className,
        )}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("common.toggleNavigationMenu")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pt-12">
          {/* Navigation List Items */}
          {children && <div className="px-3 py-2 space-y-1">{children}</div>}

          {/* Unified Mobile Theme & Language Section */}
          <div
            className={cn(
              children && "border-t border-border",
              "px-3 py-2",
              !footer && "border-b border-border",
            )}
          >
            <div className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-xs font-semibold text-foreground">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
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
        </div>

        {/* Unified Bottom Actions Footer Bar */}
        {footer && (
          <div className="shrink-0 px-3 py-3 border-t border-border bg-muted/40">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
