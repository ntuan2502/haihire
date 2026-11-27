"use client";

import { useContext, useMemo } from "react";
import {
  QueryClient,
  QueryClientContext,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type {
  AiRouteTestTarget,
  CreateAiConnectionInput,
  GenerateScoringCriteriaInput,
  GenerateScreeningQuestionsInput,
  TestAiConnectionInput,
  UpdateAiConnectionInput,
  UpdateAiFeatureRoutesInput,
  UpdateAiPolicyInput,
} from "@haihire/shared";
import { aiSettingsApi, jobsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { queryKeys } from "./query-keys";

function useSafeQueryClient(): QueryClient {
  const existing = useContext(QueryClientContext);
  const fallback = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      }),
    [],
  );
  return existing ?? fallback;
}

export function useAiStatusQuery(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const queryClient = useSafeQueryClient();

  return useQuery(
    {
      queryKey: queryKeys.aiStatus(orgId),
      queryFn: () => aiSettingsApi.getStatus(),
      enabled: Boolean(orgId) && (options?.enabled ?? true),
      staleTime: 30 * 1000,
    },
    queryClient,
  );
}

export function useAiOverviewQuery(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const queryClient = useSafeQueryClient();

  return useQuery(
    {
      queryKey: queryKeys.aiOverview(orgId),
      queryFn: () => aiSettingsApi.getOverview(),
      enabled: Boolean(orgId) && (options?.enabled ?? true),
      staleTime: 15 * 1000,
    },
    queryClient,
  );
}

export function useUpdateAiPolicyMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (data: UpdateAiPolicyInput) =>
        aiSettingsApi.updatePolicy(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useCreateAiConnectionMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (data: CreateAiConnectionInput) =>
        aiSettingsApi.createConnection(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useUpdateAiConnectionMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: ({
        id,
        data,
      }: {
        id: string;
        data: UpdateAiConnectionInput;
      }) => aiSettingsApi.updateConnection(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useDeleteAiConnectionMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (id: string) => aiSettingsApi.deleteConnection(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useTestAiConnectionMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (data: TestAiConnectionInput) =>
        aiSettingsApi.testConnection(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useUpdateAiRoutesMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (data: UpdateAiFeatureRoutesInput) =>
        aiSettingsApi.updateRoutes(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useTestAiRouteMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (feature: AiRouteTestTarget) =>
        aiSettingsApi.testRoute(feature),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useGenerateScreeningQuestionsMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (data: GenerateScreeningQuestionsInput) =>
        jobsApi.generateScreeningQuestions(data),
    },
    queryClient,
  );
}

export function useGenerateScoringCriteriaMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (data: GenerateScoringCriteriaInput) =>
        jobsApi.generateScoringCriteria(data),
    },
    queryClient,
  );
}
