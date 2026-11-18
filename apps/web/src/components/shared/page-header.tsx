import type { ComponentType, ReactNode } from "react";
import { cn } from "cn";

export interface PageHeaderProps {
  title: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  bordered?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  icon: Icon,
  badge,
  subtitle,
  actions,
  bordered = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        bordered && "pb-5 border-b border-border",
        className,
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
            {badge !== undefined &&
              badge !== null &&
              (typeof badge === "string" || typeof badge === "number" ? (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border shrink-0">
                  {badge}
                </span>
              ) : (
                badge
              ))}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
