import { canonicalizeTimezone } from "@haihire/shared";
import type { Prisma } from "@prisma/client";

export interface OrganizationLogoMetadata {
  id: string;
  logoObjectKey?: string | null;
  logoMimeType?: string | null;
  logoUpdatedAt?: Date | string | null;
}

export const ORG_SUMMARY_SELECT = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  logoObjectKey: true,
  logoUpdatedAt: true,
  defaultLanguage: true,
  timezone: true,
  dateFormat: true,
  timeFormat: true,
  nameDisplayOrder: true,
  defaultCurrency: true,
} as const;

export function getPreferredMembershipOrderBy(): Prisma.OrganizationMemberOrderByWithRelationInput[] {
  return [
    { lastAccessedAt: { sort: "desc", nulls: "last" } },
    { createdAt: "asc" },
    { organizationId: "asc" },
  ];
}

export function getPreferredOwnedOrgOrderBy(): Prisma.OrganizationOrderByWithRelationInput[] {
  return [{ createdAt: "asc" }, { id: "asc" }];
}

export function buildOrganizationLogoUrl(
  org: OrganizationLogoMetadata,
): string | null {
  if (!org.logoObjectKey || !org.id) {
    return null;
  }
  const version = org.logoUpdatedAt ? new Date(org.logoUpdatedAt).getTime() : 0;
  const query = Number.isFinite(version) && version > 0 ? `?v=${version}` : "";
  return `/organizations/public/${encodeURIComponent(org.id)}/logo${query}`;
}

export function attachOrganizationLogoUrl<T extends OrganizationLogoMetadata>(
  org: T,
): Omit<T, "logoObjectKey" | "logoMimeType" | "logoUpdatedAt"> & {
  logoUrl: string | null;
} {
  const logoUrl = buildOrganizationLogoUrl(org);
  const {
    logoObjectKey: _logoObjectKey,
    logoMimeType: _logoMimeType,
    logoUpdatedAt: _logoUpdatedAt,
    ...rest
  } = org;
  return {
    ...rest,
    logoUrl,
  };
}

export function serializeOrganizationSummary<
  T extends OrganizationLogoMetadata & { timezone?: string | null },
>(org: T) {
  const withLogo = attachOrganizationLogoUrl(org);
  if (typeof withLogo.timezone === "string" && withLogo.timezone.length > 0) {
    return {
      ...withLogo,
      timezone: canonicalizeTimezone(withLogo.timezone),
    } as typeof withLogo;
  }
  return withLogo;
}
