"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { BRAND_CONFIG } from "@haihire/shared";
import { cn } from "cn";
import { OrganizationLogo } from "@/components/shared/organization-logo";

export interface PublicFooterProps {
  /** Company/Organization name (optional) */
  orgName?: string;
  /** Company/Organization slug (optional) */
  orgSlug?: string;
  /** Organization logo URL (optional) */
  orgLogoUrl?: string | null;
  /** Custom additional CSS classes */
  className?: string;
  /** Custom max-width container class (default: max-w-7xl) */
  maxWidthClassName?: string;
}

export function PublicFooter({
  orgName,
  orgSlug,
  orgLogoUrl,
  className,
  maxWidthClassName = "max-w-7xl",
}: PublicFooterProps) {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const displayName = orgName || BRAND_CONFIG.name;

  return (
    <footer
      className={cn(
        "border-t border-border bg-card/70 backdrop-blur-xs py-6 sm:py-8 text-center text-xs text-muted-foreground mt-auto transition-colors select-none",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4",
          maxWidthClassName,
        )}
      >
        <div className="flex items-center gap-2.5">
          {orgSlug ? (
            <Link
              href={`/careers/${orgSlug}`}
              className="flex items-center gap-2 group hover:opacity-85 transition-opacity"
            >
              <OrganizationLogo
                name={displayName}
                logoUrl={orgLogoUrl}
                size="sm"
                variant="gradient"
                decorative
                className="font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform"
              />
              <span className="font-semibold text-foreground">
                {displayName} {t("careers.title")}
              </span>
            </Link>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 group hover:opacity-85 transition-opacity"
            >
              <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
                {BRAND_CONFIG.monogram}
              </div>
              <span className="font-semibold text-foreground">
                {BRAND_CONFIG.name}
              </span>
            </Link>
          )}
        </div>

        <div className="text-muted-foreground">
          {t("careers.poweredBy")}{" "}
          <Link
            href="/"
            className="font-bold text-foreground hover:text-primary transition-colors"
          >
            {BRAND_CONFIG.legalName}
          </Link>{" "}
          • © {currentYear} {displayName}. {t("careers.allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}

export const CareersFooter = PublicFooter;
export type CareersFooterProps = PublicFooterProps;
