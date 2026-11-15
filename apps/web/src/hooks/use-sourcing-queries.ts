import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sourcingApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { queryKeys } from "./query-keys";
import type {
  CreateTrackingLinkDto,
  UpdateTrackingLinkDto,
  TimeRangeFilter,
  SourcingChannel,
} from "@haihire/shared";

export function useSourcingStatsQuery(params?: {
  timeRange?: TimeRangeFilter;
  jobId?: string;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.sourcingStats({
      ...params,
      orgId: user?.organizationId,
    }),
    queryFn: () => sourcingApi.getStats(params),
    staleTime: 60 * 1000,
  });
}

export function useTrackingLinksQuery(params?: {
  page?: number;
  limit?: number;
  search?: string;
  jobId?: string;
  isActive?: boolean;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.sourcingLinks({
      ...params,
      orgId: user?.organizationId,
    }),
    queryFn: () => sourcingApi.getLinks(params),
    staleTime: 30 * 1000,
  });
}

export function useTrackingLinkDetailQuery(
  id: string,
  params?: { timeRange?: TimeRangeFilter },
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.sourcingLinkDetail(id, {
      ...params,
      orgId: user?.organizationId,
    }),
    queryFn: () => sourcingApi.getLinkDetails(id, params),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

export function useAttributionLogQuery(params?: {
  page?: number;
  limit?: number;
  search?: string;
  jobId?: string;
  source?: SourcingChannel;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.sourcingAttributionLog({
      ...params,
      orgId: user?.organizationId,
    }),
    queryFn: () => sourcingApi.getAttributionLog(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateTrackingLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTrackingLinkDto) => sourcingApi.createLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
    },
  });
}

export function useUpdateTrackingLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTrackingLinkDto }) =>
      sourcingApi.updateLink(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
    },
  });
}

export function useDeleteTrackingLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sourcingApi.deleteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
    },
  });
}
