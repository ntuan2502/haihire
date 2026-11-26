"use client";

import { useContext, useMemo } from "react";
import {
  QueryClient,
  QueryClientContext,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type {
  GenerateScoringCriteriaInput,
  GenerateScreeningQuestionsInput,
  TestAiConnectionInput,
  UpsertAiSettingInput,
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

export function useAiSettingQuery(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const queryClient = useSafeQueryClient();

  return useQuery(
    {
      queryKey: queryKeys.aiSetting(orgId),
      queryFn: () => aiSettingsApi.getSetting(),
      enabled: Boolean(orgId) && (options?.enabled ?? true),
      staleTime: 30 * 1000,
    },
    queryClient,
  );
}

export function useUpsertAiSettingMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: (data: UpsertAiSettingInput) =>
        aiSettingsApi.upsertSetting(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      },
    },
    queryClient,
  );
}

export function useDeleteAiSettingMutation() {
  const queryClient = useSafeQueryClient();

  return useMutation(
    {
      mutationFn: () => aiSettingsApi.deleteSetting(),
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
