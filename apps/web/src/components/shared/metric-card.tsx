import type { ReactNode, ComponentType, SVGProps } from "react";
import { cn } from "cn";

export type MetricCardColor =
  "blue" | "indigo" | "emerald" | "amber" | "rose" | "slate";

export interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  subtext?: ReactNode;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color?: MetricCardColor;
  onClick?: () => void;
  className?: string;
  badge?: {
    text: string;
    variant?: "success" | "warning" | "info" | "neutral";
  };
}

const COLOR_STYLES: Record<
  MetricCardColor,
  {
    iconBg: string;
    iconColor: string;
    iconBorder: string;
  }
> = {
  blue: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    iconBorder: "border-primary/20",
  },
  indigo: {
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBorder: "border-violet-500/20",
  },
  emerald: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBorder: "border-emerald-500/20",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBorder: "border-amber-500/20",
  },
  rose: {
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBorder: "border-rose-500/20",
  },
  slate: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    iconBorder: "border-border",
  },
};

export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  color = "blue",
  onClick,
  className,
  badge,
}: MetricCardProps) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.blue;

  const content = (
    <>
      <div className="min-w-0 pr-3">
        <p className="text-xs font-semibold text-muted-foreground truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {value}
          </span>
          {badge && (
            <span
              className={cn(
                "text-[11px] font-semibold",
                badge.variant === "success" &&
                  "text-emerald-600 dark:text-emerald-400",
                badge.variant === "warning" &&
                  "text-amber-600 dark:text-amber-400",
                badge.variant === "info" && "text-primary",
                (!badge.variant || badge.variant === "neutral") &&
                  "text-muted-foreground",
              )}
            >
              {badge.text}
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {subtext}
          </p>
        )}
      </div>

      <div
        className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform",
          styles.iconBg,
          styles.iconColor,
          styles.iconBorder,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left p-4 sm:p-5 rounded-xl bg-card text-card-foreground border border-border shadow-2xs flex items-center justify-between transition-all hover:shadow-xs cursor-pointer hover:border-ring/40",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-xl bg-card text-card-foreground border border-border shadow-2xs flex items-center justify-between transition-all hover:shadow-xs",
        className,
      )}
    >
      {content}
    </div>
  );
}
