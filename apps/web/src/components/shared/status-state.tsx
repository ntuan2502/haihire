"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { FileQuestion, ShieldAlert } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useOptionalI18n } from "@/i18n/optional";

export type StatusStateCode = "403" | "404";
export type StatusStateVariant = "card" | "page";
export type StatusStateActionVariant = "primary" | "outline";

export interface StatusStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: StatusStateActionVariant;
  icon?: ComponentType<{ className?: string }>;
}

export interface StatusStateProps {
  status: StatusStateCode;
  variant?: StatusStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionVariant?: StatusStateActionVariant;
  actionIcon?: ComponentType<{ className?: string }>;
  secondaryAction?: StatusStateAction;
  showCodeBadge?: boolean;
  headingAs?: "h1" | "h2";
  testId?: string;
  className?: string;
}

const STATUS_STYLE_MAP: Record<
  StatusStateCode,
  {
    icon: ComponentType<{ className?: string }>;
    iconBoxClass: string;
    role?: "alert";
  }
> = {
  "403": {
    icon: ShieldAlert,
    iconBoxClass:
      "bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 text-amber-600 dark:text-amber-400",
    role: "alert",
  },
  "404": {
    icon: FileQuestion,
    iconBoxClass:
      "bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 text-blue-600 dark:text-blue-400",
  },
};

const ACTION_VARIANT_CLASS: Record<StatusStateActionVariant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white border border-transparent shadow-xs",
  outline:
    "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs",
};

function renderStatusAction(action: StatusStateAction) {
  const Icon = action.icon;
  const toneClass = ACTION_VARIANT_CLASS[action.variant ?? "primary"];
  const baseClass = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-9 text-xs font-semibold transition-colors cursor-pointer",
    toneClass,
  );

  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>{action.label}</span>
    </>
  );

  if (action.onClick) {
    return (
      <Button
        type="button"
        variant={action.variant === "outline" ? "outline" : "default"}
        onClick={action.onClick}
        className={baseClass}
      >
        {content}
      </Button>
    );
  }

  if (action.href) {
    return (
      <Link href={action.href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return null;
}

/**
 * Shared 403 / 404 state component with semantic styling (`card` for embedded panels,
 * `page` for standalone route error/restricted screens).
 */
export function StatusState({
  status,
  variant = "card",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionVariant = "primary",
  actionIcon,
  secondaryAction,
  showCodeBadge,
  headingAs,
  testId,
  className,
}: StatusStateProps) {
  const { t } = useOptionalI18n();
  const config = STATUS_STYLE_MAP[status];
  const Icon = config.icon;
  const Heading = headingAs ?? (variant === "page" ? "h1" : "h2");
  const shouldShowCodeBadge = showCodeBadge ?? status === "404";

  const resolvedTitle =
    title ??
    (status === "403"
      ? t("errors.forbidden.title")
      : t("errors.notFound.title"));
  const resolvedDescription =
    description ??
    (status === "403"
      ? t("errors.forbidden.description")
      : t("errors.notFound.description"));

  const primaryAction: StatusStateAction | null = actionLabel
    ? {
        label: actionLabel,
        href: actionHref,
        onClick: onAction,
        variant: actionVariant,
        icon: actionIcon,
      }
    : null;

  const hasActions = Boolean(
    (primaryAction && (primaryAction.href || primaryAction.onClick)) ||
    (secondaryAction && (secondaryAction.href || secondaryAction.onClick)),
  );

  const cardBody = (
    <>
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-2xs",
          config.iconBoxClass,
        )}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>

      {shouldShowCodeBadge && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {status}
        </span>
      )}

      <div className="space-y-1.5 max-w-md mx-auto">
        <Heading
          className={cn(
            "font-bold tracking-tight text-slate-900 dark:text-white",
            variant === "page" ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
          )}
        >
          {resolvedTitle}
        </Heading>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {resolvedDescription}
        </p>
      </div>

      {hasActions && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {primaryAction && renderStatusAction(primaryAction)}
          {secondaryAction && renderStatusAction(secondaryAction)}
        </div>
      )}
    </>
  );

  if (variant === "page") {
    return (
      <div
        role={config.role}
        data-testid={testId}
        className={cn(
          "min-h-[65vh] w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6",
          className,
        )}
      >
        <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center text-center space-y-5">
          {cardBody}
        </div>
      </div>
    );
  }

  return (
    <div
      role={config.role}
      data-testid={testId}
      className={cn(
        "rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-4",
        className,
      )}
    >
      {cardBody}
    </div>
  );
}
