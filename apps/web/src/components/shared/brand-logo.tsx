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
    <div
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
    >
      {/* Monogram Badge */}
      <div
        className={cn(
          "relative flex items-center justify-center font-semibold tracking-tight bg-primary text-primary-foreground",
          sizeStyles.icon,
          iconClassName,
        )}
      >
        <div className="flex h-full w-full items-center justify-center rounded-[inherit] bg-primary">
          <span className="font-semibold tracking-tight text-primary-foreground">
            {BRAND_CONFIG.monogram}
          </span>
        </div>
      </div>

      {/* Brand Text */}
      {variant === "full" && (
        <div className="flex flex-col">
          <div
            className={cn(
              "flex items-center font-semibold tracking-tight",
              sizeStyles.text,
              textClassName,
            )}
          >
            <span className="text-foreground">Hai</span>
            <span className="text-primary">Hire</span>
          </div>
          {showTagline && (
            <span
              className={cn(
                "font-medium text-muted-foreground -mt-0.5",
                sizeStyles.tagline,
              )}
            >
              {BRAND_CONFIG.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
