import { api } from "./client";
import type {
  Organization,
  User,
  InviteLink,
  InviteLinkUsageItem,
  PublicInvitePreview,
} from "@/types";
import type {
  Role,
  Permission,
  OrganizationLocalizationSettings,
} from "@haihire/shared";

export type UpdateOrgPayload = {
  name?: string;
  slug?: string;
} & Partial<OrganizationLocalizationSettings>;

export const organizationsApi = {
  getPublicOrg: async (slug: string): Promise<Organization> => {
    const response = await api.get<Organization>(
      `/organizations/public/${slug}`,
    );
    return response.data;
  },

  getMyOrg: async (): Promise<Organization | null> => {
    const response = await api.get<Organization | null>("/organizations/my");
    return response.data;
  },

  getMyOrgs: async (): Promise<Organization[]> => {
    const response = await api.get<Organization[]>("/organizations/my/all");
    return response.data;
  },

  switchOrg: async (
    organizationId: string,
  ): Promise<{ success: boolean; organization: Organization; user: User }> => {
    const response = await api.post<{
      success: boolean;
      organization: Organization;
      user: User;
    }>("/organizations/switch", { organizationId });
    return response.data;
  },

  getMembers: async (): Promise<User[]> => {
    const response = await api.get<User[]>("/organizations/my/members");
    return response.data;
  },

  getInterviewers: async (): Promise<
    Pick<User, "id" | "name" | "email" | "role">[]
  > => {
    const response = await api.get<
      Pick<User, "id" | "name" | "email" | "role">[]
    >("/organizations/my/interviewers");
    return response.data;
  },

  updateMyOrg: async (data: UpdateOrgPayload): Promise<Organization> => {
    const response = await api.patch<Organization>("/organizations/my", data);
    return response.data;
  },

  uploadMyOrgLogo: async (file: File): Promise<Organization> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<Organization>(
      "/organizations/my/logo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  deleteMyOrgLogo: async (): Promise<Organization> => {
    const response = await api.delete<Organization>("/organizations/my/logo");
    return response.data;
  },

  deleteMyOrg: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      "/organizations/my",
    );
    return response.data;
  },

  transferOwnership: async (
    newOwnerUserId: string,
  ): Promise<{ success: boolean; newOwnerId: string }> => {
    const response = await api.post<{ success: boolean; newOwnerId: string }>(
      "/organizations/my/transfer-ownership",
      { newOwnerUserId },
    );
    return response.data;
  },

  createInviteLink: async (data: {
    email?: string;
    role?: string;
    expiresIn?: string;
    maxUses?: string;
  }): Promise<InviteLink> => {
    const response = await api.post<InviteLink>(
      "/organizations/my/invite-links",
      data,
    );
    return response.data;
  },

  getInviteLinks: async (options?: {
    includeRevoked?: boolean;
  }): Promise<InviteLink[]> => {
    const response = await api.get<InviteLink[]>(
      "/organizations/my/invite-links",
      {
        params: options?.includeRevoked
          ? { includeRevoked: "true" }
          : undefined,
      },
    );
    return response.data;
  },

  resendInviteLink: async (id: string): Promise<InviteLink> => {
    const response = await api.post<InviteLink>(
      `/organizations/my/invite-links/${id}/resend`,
    );
    return response.data;
  },

  getInviteLinkUsages: async (id: string): Promise<InviteLinkUsageItem[]> => {
    const response = await api.get<InviteLinkUsageItem[]>(
      `/organizations/my/invite-links/${id}/usages`,
    );
    return response.data;
  },

  revokeInviteLink: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/organizations/my/invite-links/${id}`,
    );
    return response.data;
  },

  getPublicInvite: async (token: string): Promise<PublicInvitePreview> => {
    const response = await api.get<PublicInvitePreview>(
      `/organizations/invite-links/public/${token}`,
    );
    return response.data;
  },

  joinByToken: async (
    token: string,
  ): Promise<{
    success: boolean;
    organization: Organization;
    role: string;
    message: string;
  }> => {
    const response = await api.post(
      `/organizations/invite-links/join/${token}`,
    );
    return response.data;
  },

  updateMemberRole: async (
    memberId: string,
    role: Role,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/organizations/my/members/${memberId}/role`,
      { role },
    );
    return response.data;
  },

  removeMember: async (
    memberId: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/organizations/my/members/${memberId}`,
    );
    return response.data;
  },

  getRolePermissionsMatrix: async (): Promise<
    Record<Role, Record<Permission, boolean>>
  > => {
    const response = await api.get<Record<Role, Record<Permission, boolean>>>(
      "/organizations/my/roles/permissions",
    );
    return response.data;
  },

  updateRolePermissions: async (
    role: Role,
    permissions: Array<{ permission: Permission; granted: boolean }>,
  ): Promise<{ role: Role; permissions: Record<Permission, boolean> }> => {
    const response = await api.patch<{
      role: Role;
      permissions: Record<Permission, boolean>;
    }>(`/organizations/my/roles/${role}/permissions`, { permissions });
    return response.data;
  },

  resetRolePermissions: async (role?: Role): Promise<{ deleted: number }> => {
    const url = role
      ? `/organizations/my/roles/${role}/reset`
      : `/organizations/my/roles/reset`;
    const response = await api.post<{ deleted: number }>(url);
    return response.data;
  },

  getAuditLogs: async (params?: {
    action?: string;
    resource?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogsResponse> => {
    const query = new URLSearchParams();
    if (params?.action) query.set("action", params.action);
    if (params?.resource) query.set("resource", params.resource);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined)
      query.set("offset", String(params.offset));
    const qs = query.toString();
    const url = `/organizations/my/audit-log${qs ? `?${qs}` : ""}`;
    const response = await api.get<AuditLogsResponse>(url);
    return response.data;
  },
};

export interface OrganizationAuditLogRecord {
  id: string;
  organizationId: string;
  actorId: string | null;
  action: string;
  resource: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    role: string;
    avatarUrl: string | null;
  } | null;
}

export interface AuditLogsResponse {
  data: OrganizationAuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
}
