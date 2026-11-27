"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export interface ApplicationSectionCardProps {
  icon: LucideIcon;
  title: string;
  statusMeta?: ReactNode;
  headerActions?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  defaultCollapsed?: boolean;
  bodyDivider?: boolean;
  testId?: string;
  className?: string;
  children: ReactNode;
}

function getSectionBodyClassName(bodyDivider: boolean): string {
  return bodyDivider
    ? "-mx-4 sm:-mx-5 px-4 sm:px-5 pt-3.5 border-t border-border"
    : "";
}

/**
 * Shared section card frame modeled after AiScoreCard so all application detail
 * tabs share an identical header bar, icon badge, spacing, and collapse behavior.
 */
export function ApplicationSectionCard({
  icon: Icon,
  title,
  statusMeta,
  headerActions,
  collapsible = false,
  collapsed,
  onToggleCollapse,
  defaultCollapsed = false,
  bodyDivider = false,
  testId,
  className,
  children,
}: ApplicationSectionCardProps) {
  const { t } = useI18n();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);

  const isControlled = typeof collapsed === "boolean";
  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
      return;
    }
    if (!isControlled) {
      setInternalCollapsed((prev) => !prev);
    }
  };

  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-5 shadow-xs space-y-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {statusMeta}
        </div>

        {(headerActions || collapsible) && (
          <div className="flex flex-wrap items-center gap-1.5 max-w-full min-w-0">
            {headerActions}
            {collapsible && (
              <button
                type="button"
                onClick={handleToggleCollapse}
                aria-label={
                  isCollapsed
                    ? t("applications.aiEvaluation.expandAll")
                    : t("applications.aiEvaluation.collapseAll")
                }
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className={getSectionBodyClassName(bodyDivider)}>{children}</div>
      )}
    </div>
  );
}
