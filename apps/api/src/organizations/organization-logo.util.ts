export interface OrganizationLogoMetadata {
  id: string;
  logoObjectKey?: string | null;
  logoMimeType?: string | null;
  logoUpdatedAt?: Date | string | null;
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
