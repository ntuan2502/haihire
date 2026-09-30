import { api } from "./client";
import type {
  SourcingStats,
  TrackingLinkItem,
  AttributionLogItem,
  CreateTrackingLinkDto,
  UpdateTrackingLinkDto,
  TimeRangeFilter,
  SourcingChannel,
} from "@haihire/shared";
import type { PaginatedResult } from "@/types";

export const sourcingApi = {
  getStats: async (params?: {
    timeRange?: TimeRangeFilter;
    jobId?: string;
  }): Promise<SourcingStats> => {
    const response = await api.get<SourcingStats>("/sourcing/stats", { params });
    return response.data;
  },

  getLinks: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    jobId?: string;
    isActive?: boolean;
  }): Promise<PaginatedResult<TrackingLinkItem>> => {
    const response = await api.get<PaginatedResult<TrackingLinkItem>>("/sourcing/links", {
      params,
    });
    return response.data;
  },

  createLink: async (data: CreateTrackingLinkDto): Promise<TrackingLinkItem> => {
    const response = await api.post<TrackingLinkItem>("/sourcing/links", data);
    return response.data;
  },

  updateLink: async (
    id: string,
    data: UpdateTrackingLinkDto,
  ): Promise<{ success: boolean }> => {
    const response = await api.patch<{ success: boolean }>(`/sourcing/links/${id}`, data);
    return response.data;
  },

  deleteLink: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(`/sourcing/links/${id}`);
    return response.data;
  },

  getAttributionLog: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    jobId?: string;
    source?: SourcingChannel;
  }): Promise<PaginatedResult<AttributionLogItem>> => {
    const response = await api.get<PaginatedResult<AttributionLogItem>>(
      "/sourcing/attribution-log",
      { params },
    );
    return response.data;
  },

  recordPublicClick: async (data: {
    token: string;
    referrer?: string;
  }): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>("/sourcing/public/click", data);
    return response.data;
  },
};
