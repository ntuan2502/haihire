"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, authApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type {
  Organization,
  User,
  InviteLink,
  InviteLinkUsageItem,
} from "@/types";
import type {
  Role,
  Permission,
  OrganizationLocalizationSettings,
} from "@haihire/shared";
import { queryKeys } from "./query-keys";

export function useMyOrg(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<Organization | null>({
    queryKey: queryKeys.myOrg(user?.organizationId),
    queryFn: () => organizationsApi.getMyOrg(),
    enabled: options?.enabled ?? true,
    initialData: () =>
      user?.organization &&
      (!user.organizationId || user.organization.id === user.organizationId)
        ? user.organization
        : undefined,
  });
}

export function useMyOrgs(options?: { enabled?: boolean }) {
  return useQuery<Organization[]>({
    queryKey: queryKeys.myOrgs(),
    queryFn: () => organizationsApi.getMyOrgs(),
    enabled: options?.enabled ?? true,
  });
}

export function useSwitchOrgMutation() {
  const queryClient = useQueryClient();
  const { updateUserOrg } = useAuth();

  return useMutation({
    mutationFn: (organizationId: string) =>
      organizationsApi.switchOrg(organizationId),
    onSuccess: (data) => {
      updateUserOrg(data.organization, data.user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrgs() });
    },
    onError: () => {
      // Defense-in-depth: sync org list cleanly on switch failure without refetching stale-scoped caches
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrgs() });
    },
  });
}

export function useUpdateMyOrgMutation() {
  const queryClient = useQueryClient();
  const { updateUserOrg } = useAuth();

  return useMutation({
    mutationFn: (
      data: {
        name?: string;
        slug?: string;
      } & Partial<OrganizationLocalizationSettings>,
    ) => organizationsApi.updateMyOrg(data),
    onSuccess: (updatedOrg) => {
      if (updatedOrg) {
        updateUserOrg(updatedOrg);
        queryClient.setQueryData(queryKeys.myOrg(updatedOrg.id), updatedOrg);
        queryClient.setQueryData<Organization[]>(queryKeys.myOrgs(), (prev) =>
          prev?.map((org) => (org.id === updatedOrg.id ? updatedOrg : org)),
        );
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
  });
}

function useOrgProfileMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Organization>,
) {
  const queryClient = useQueryClient();
  const { updateUserOrg } = useAuth();

  return useMutation({
    mutationFn,
    onSuccess: (updatedOrg) => {
      if (updatedOrg) {
        updateUserOrg(updatedOrg);
        queryClient.setQueryData(queryKeys.myOrg(updatedOrg.id), updatedOrg);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrgs() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
  });
}

export function useUploadOrgLogoMutation() {
  return useOrgProfileMutation((file: File) =>
    organizationsApi.uploadMyOrgLogo(file),
  );
}

export function useDeleteOrgLogoMutation() {
  return useOrgProfileMutation(() => organizationsApi.deleteMyOrgLogo());
}

export function useTransferOwnershipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newOwnerUserId: string) =>
      organizationsApi.transferOwnership(newOwnerUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
  });
}

export function useDeleteMyOrgMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => organizationsApi.deleteMyOrg(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
  });
}

export function useLeaveOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => organizationsApi.leaveMyOrg(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrgs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myPermissions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrgs() });
    },
  });
}

export function useOrgMembers(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<User[]>({
    queryKey: queryKeys.orgMembers(user?.organizationId),
    queryFn: () => organizationsApi.getMembers(),
    enabled: options?.enabled ?? true,
  });
}

export function useOrgInterviewers(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<Pick<User, "id" | "name" | "email" | "role">[]>({
    queryKey: queryKeys.orgInterviewers(user?.organizationId),
    queryFn: () => organizationsApi.getInterviewers(),
    enabled: options?.enabled ?? true,
  });
}

export function useInviteLinks(options?: {
  enabled?: boolean;
  includeRevoked?: boolean;
}) {
  const { user } = useAuth();
  const includeRevoked = Boolean(options?.includeRevoked);
  return useQuery<InviteLink[]>({
    queryKey: [
      ...queryKeys.inviteLinks(user?.organizationId),
      { includeRevoked },
    ],
    queryFn: () => organizationsApi.getInviteLinks({ includeRevoked }),
    enabled: options?.enabled ?? true,
  });
}

export function useInviteLinkUsages(
  linkId: string | null,
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  return useQuery<InviteLinkUsageItem[]>({
    queryKey: queryKeys.inviteLinkUsages(linkId ?? "", user?.organizationId),
    queryFn: () => organizationsApi.getInviteLinkUsages(linkId!),
    enabled: Boolean(linkId) && (options?.enabled ?? true),
  });
}

export function useResendInviteLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationsApi.resendInviteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
  });
}

export function useCreateInviteLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email?: string;
      role?: string;
      expiresIn?: string;
      maxUses?: string;
    }) => organizationsApi.createInviteLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
  });
}

export function useRevokeInviteLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationsApi.revokeInviteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
  });
}

export function useUpdateMemberRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      organizationsApi.updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
  });
}

export function useRemoveMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => organizationsApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
  });
}

export function useRolePermissionsMatrix(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<Record<Role, Record<Permission, boolean>>>({
    queryKey: queryKeys.rolePermissionsMatrix(user?.organizationId),
    queryFn: () => organizationsApi.getRolePermissionsMatrix(),
    enabled: options?.enabled ?? true,
  });
}

export function useMyPermissions(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<{ permissions: Permission[] }>({
    queryKey: queryKeys.myPermissions(user?.organizationId, user?.role),
    queryFn: () =>
      authApi.getMyPermissions() as Promise<{ permissions: Permission[] }>,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      role,
      permissions,
    }: {
      role: Role;
      permissions: Array<{ permission: Permission; granted: boolean }>;
    }) => organizationsApi.updateRolePermissions(role, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rolePermissionsMatrix(),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rolePermissionsMatrix(),
      });
    },
  });
}

export function useResetRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (role?: Role) => organizationsApi.resetRolePermissions(role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rolePermissionsMatrix(),
      });
    },
  });
}

export function useAuditLogsQuery(
  params?: {
    action?: string;
    resource?: string;
    limit?: number;
    offset?: number;
  },
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  return useQuery({
    queryKey: queryKeys.auditLogs({
      ...params,
      ...(orgId !== undefined ? { orgId } : {}),
    }),
    queryFn: () => organizationsApi.getAuditLogs(params),
    enabled: options?.enabled ?? true,
  });
}
