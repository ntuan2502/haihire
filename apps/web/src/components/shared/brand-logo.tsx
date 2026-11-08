import { BRAND_CONFIG } from "@haihire/shared";
import { cn } from "cn";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon-only";
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
}

export function BrandLogo({
  size = "md",
  variant = "full",
  className,
  iconClassName,
  textClassName,
  showTagline = false,
}: BrandLogoProps) {
  const sizeStyles = {
    sm: {
      icon: "h-7 w-7 rounded-lg text-xs",
      text: "text-sm",
      tagline: "text-[10px]",
    },
    md: {
      icon: "h-9 w-9 rounded-xl text-sm",
      text: "text-base sm:text-lg",
      tagline: "text-xs",
    },
    lg: {
      icon: "h-11 w-11 rounded-xl text-lg",
      text: "text-xl sm:text-2xl",
      tagline: "text-xs",
    },
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Monogram Badge */}
      <div
        className={cn(
          "relative flex items-center justify-center font-black tracking-tighter text-white shadow-md shadow-blue-500/20 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 transition-transform hover:scale-105",
          sizeStyles.icon,
          iconClassName,
        )}
      >
        <div className="flex h-full w-full items-center justify-center rounded-[inherit] bg-gradient-to-tr from-blue-700 to-indigo-700 dark:from-slate-950 dark:to-slate-900">
          <span className="font-extrabold tracking-tighter text-white dark:text-cyan-300">
            {BRAND_CONFIG.monogram}
          </span>
        </div>
      </div>

      {/* Brand Text */}
      {variant === "full" && (
        <div className="flex flex-col">
          <div className={cn("flex items-center font-black tracking-tight", sizeStyles.text, textClassName)}>
            <span className="text-slate-900 dark:text-white">Hai</span>
            <span className="text-blue-600 dark:text-cyan-400">Hire</span>
          </div>
          {showTagline && (
            <span className={cn("font-medium text-slate-500 dark:text-slate-400 -mt-0.5", sizeStyles.tagline)}>
              {BRAND_CONFIG.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
