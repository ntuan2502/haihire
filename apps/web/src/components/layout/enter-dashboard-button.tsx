"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { cn } from "cn";

export interface EnterDashboardButtonProps {
  /** Optional custom text override (defaults to t("landing.enterDashboard")) */
  label?: string;
  /** Full-width style (used in mobile drawers) */
  fullWidth?: boolean;
  /** Custom additional className */
  className?: string;
  /** Click handler (e.g. to close mobile drawer) */
  onClick?: () => void;
}

export function EnterDashboardButton({
  label,
  fullWidth = false,
  className,
  onClick,
}: EnterDashboardButtonProps) {
  const { user } = useAuth();
  const { t } = useI18n();

  const href = user?.organizationId ? "/dashboard" : "/auth/onboarding";
  const text = label || t("landing.enterDashboard");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer font-medium",
        fullWidth
          ? "w-full h-10 text-xs gap-2"
          : "px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm",
        className,
      )}
    >
      <span>{text}</span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
