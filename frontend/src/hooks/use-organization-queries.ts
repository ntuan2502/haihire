"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { Organization, User, InviteLink } from "@/types";
import { queryKeys } from "./query-keys";

export function useMyOrg() {
  return useQuery<Organization | null>({
    queryKey: queryKeys.myOrg(),
    queryFn: () => organizationsApi.getMyOrg(),
  });
}

export function useMyOrgs() {
  return useQuery<Organization[]>({
    queryKey: queryKeys.myOrgs(),
    queryFn: () => organizationsApi.getMyOrgs(),
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
      queryClient.invalidateQueries();
    },
    onError: () => {
      // Defense-in-depth: sync queries on switch failure.
      // Verified: no infinite loop risk because mutations are strictly user-triggered
      queryClient.invalidateQueries();
    },
  });
}

export function useUpdateMyOrgMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; slug?: string }) =>
      organizationsApi.updateMyOrg(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
  });
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

export function useOrgMembers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleSseEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail?.type === "MEMBER_REMOVED" ||
        customEvent.detail?.type === "MEMBER_ROLE_UPDATED"
      ) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ats:sse_event", handleSseEvent);
      return () => window.removeEventListener("ats:sse_event", handleSseEvent);
    }
  }, [queryClient]);

  return useQuery<User[]>({
    queryKey: queryKeys.orgMembers(),
    queryFn: () => organizationsApi.getMembers(),
  });
}

export function useInviteLinks() {
  return useQuery<InviteLink[]>({
    queryKey: queryKeys.inviteLinks(),
    queryFn: () => organizationsApi.getInviteLinks(),
  });
}

export function useCreateInviteLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
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
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: "ADMIN" | "MEMBER";
    }) => organizationsApi.updateMemberRole(memberId, role),
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
