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
    iconBg: "bg-blue-50 dark:bg-blue-950/60",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBorder: "border-blue-100/80 dark:border-blue-900/60",
  },
  indigo: {
    iconBg: "bg-indigo-50 dark:bg-indigo-950/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    iconBorder: "border-indigo-100/80 dark:border-indigo-900/60",
  },
  emerald: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBorder: "border-emerald-100/80 dark:border-emerald-900/60",
  },
  amber: {
    iconBg: "bg-amber-50 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBorder: "border-amber-100/80 dark:border-amber-900/60",
  },
  rose: {
    iconBg: "bg-rose-50 dark:bg-rose-950/60",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBorder: "border-rose-100/80 dark:border-rose-900/60",
  },
  slate: {
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400",
    iconBorder: "border-slate-200 dark:border-slate-700",
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
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
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
                badge.variant === "info" && "text-blue-600 dark:text-blue-400",
                (!badge.variant || badge.variant === "neutral") &&
                  "text-slate-500 dark:text-slate-400",
              )}
            >
              {badge.text}
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            {subtext}
          </p>
        )}
      </div>

      <div
        className={cn(
          "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform",
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
          "w-full text-left p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700",
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
        "p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs",
        className,
      )}
    >
      {content}
    </div>
  );
}
