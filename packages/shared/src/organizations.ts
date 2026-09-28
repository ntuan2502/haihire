export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const InviteStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId?: string | null;
  createdAt: string;
}

export interface InviteLink {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
  expiresInDays: number | null;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  createdById: string;
  createdByName: string;
  status: InviteStatus;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isOwner?: boolean;
  avatarUrl?: string | null;
  organizationId?: string | null;
  organization?: Organization | null;
  createdAt: string;
}
