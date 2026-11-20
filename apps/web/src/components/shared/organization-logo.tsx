"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "cn";
import { resolveOrganizationLogoUrl } from "@/lib/api/client";

export type OrganizationLogoSize = "xs" | "sm" | "md" | "lg" | "xl";
export type OrganizationLogoVariant = "default" | "sidebar" | "gradient";

export interface OrganizationLogoProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: OrganizationLogoSize;
  variant?: OrganizationLogoVariant;
  decorative?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<OrganizationLogoSize, string> = {
  xs: "size-4 rounded text-[9px]",
  sm: "size-6 rounded-md text-[10px]",
  md: "size-8 rounded-lg text-xs",
  lg: "size-10 rounded-lg text-sm",
  xl: "size-12 rounded-xl text-lg",
};

const FALLBACK_VARIANT_CLASSES: Record<OrganizationLogoVariant, string> = {
  default: "bg-primary/10 border border-primary/20 text-primary font-bold",
  sidebar: "bg-sidebar-primary text-sidebar-primary-foreground font-bold",
  gradient:
    "bg-gradient-to-tr from-primary to-sky-500 text-primary-foreground font-black shadow-sm",
};

function getOrganizationInitials(
  name: string | null | undefined,
  singleChar: boolean,
): string {
  const cleaned = name?.trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (singleChar || parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export function OrganizationLogo({
  name,
  logoUrl,
  size = "md",
  variant = "default",
  decorative = false,
  className,
}: OrganizationLogoProps) {
  const resolvedSrc = resolveOrganizationLogoUrl(logoUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(resolvedSrc) && failedSrc !== resolvedSrc;
  const initials = getOrganizationInitials(
    name,
    variant === "gradient" || size === "xs",
  );

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden select-none",
        SIZE_CLASSES[size],
        showImage
          ? "bg-white dark:bg-card border border-border/80 p-0.5"
          : FALLBACK_VARIANT_CLASSES[variant],
        className,
      )}
    >
      {showImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedSrc!}
            alt={decorative ? "" : name?.trim() || ""}
            aria-hidden={decorative || undefined}
            onError={() => setFailedSrc(resolvedSrc)}
            className="h-full w-full object-contain"
          />
        </>
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <Building2 className="h-[55%] w-[55%]" aria-hidden="true" />
      )}
    </div>
  );
}
