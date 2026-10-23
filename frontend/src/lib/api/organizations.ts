import { api } from "./client";
import type { Organization, User, InviteLink } from "@/types";
import type { Role } from "@haihire/shared";

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

  updateMyOrg: async (data: {
    name?: string;
    slug?: string;
  }): Promise<Organization> => {
    const response = await api.patch<Organization>("/organizations/my", data);
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

  getInviteLinks: async (): Promise<InviteLink[]> => {
    const response = await api.get<InviteLink[]>(
      "/organizations/my/invite-links",
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

  getPublicInvite: async (
    token: string,
  ): Promise<{
    valid: boolean;
    token?: string;
    role?: string;
    organization?: { id: string; name: string; slug: string };
    createdByName?: string;
    expiresAt?: string | null;
    message?: string;
  }> => {
    const response = await api.get(
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
};
