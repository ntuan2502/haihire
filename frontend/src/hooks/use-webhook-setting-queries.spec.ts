import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useWebhookSettingsQuery,
  useCreateWebhookSettingMutation,
  useUpdateWebhookSettingMutation,
  useDeleteWebhookSettingMutation,
  useTestWebhookSettingMutation,
} from "./use-webhook-setting-queries";
import { webhookSettingsApi } from "@/lib/api";
import { queryKeys } from "./query-keys";
import type { WebhookSettingResponse } from "@haihire/shared";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", organizationId: "org-123" },
  }),
}));

vi.mock("@/lib/api", () => ({
  webhookSettingsApi: {
    getWebhookSettings: vi.fn(),
    createWebhookSetting: vi.fn(),
    updateWebhookSetting: vi.fn(),
    deleteWebhookSetting: vi.fn(),
    testWebhookSetting: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("use-webhook-setting-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Case 1: query keys match standard pattern", () => {
    expect(queryKeys.webhookSettings("org-123")).toEqual([
      "webhook-settings",
      { orgId: "org-123" },
    ]);
    expect(queryKeys.webhookSetting("s-1")).toEqual([
      "webhook-settings",
      "detail",
      "s-1",
    ]);
  });

  it("Case 2: useWebhookSettingsQuery fetches settings for active organization", async () => {
    const mockData = [
      {
        id: "setting-1",
        organizationId: "org-123",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "https://api.telegram.org/bot***/sendMessage",
        isEnabled: true,
      },
    ];
    vi.mocked(webhookSettingsApi.getWebhookSettings).mockResolvedValue(
      mockData as unknown as WebhookSettingResponse[],
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useWebhookSettingsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(webhookSettingsApi.getWebhookSettings).toHaveBeenCalledTimes(1);
  });

  it("Case 3: useCreateWebhookSettingMutation invalidates queries on both onSuccess and onError", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(webhookSettingsApi.createWebhookSetting).mockResolvedValue({
      id: "new-setting",
    } as unknown as WebhookSettingResponse);

    const { result } = renderHook(() => useCreateWebhookSettingMutation(), { wrapper });

    await result.current.mutateAsync({
      eventType: "DLQ_ALERT",
      provider: "TELEGRAM",
      webhookUrl: "https://api.telegram.org/bot123/sendMessage",
      chatId: "123",
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["webhook-settings"] });

    // Test onError invalidation
    vi.mocked(webhookSettingsApi.createWebhookSetting).mockRejectedValue(new Error("Failed"));
    try {
      await result.current.mutateAsync({
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "https://api.telegram.org/bot123/sendMessage",
      });
    } catch {
      // Expected rejection
    }

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("Case 4: useUpdateWebhookSettingMutation invalidates queries on both onSuccess and onError", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(webhookSettingsApi.updateWebhookSetting).mockResolvedValue({
      id: "setting-1",
      isEnabled: false,
    } as unknown as WebhookSettingResponse);

    const { result } = renderHook(() => useUpdateWebhookSettingMutation(), { wrapper });

    await result.current.mutateAsync({
      id: "setting-1",
      data: { isEnabled: false },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["webhook-settings"] });

    // Test onError invalidation
    vi.mocked(webhookSettingsApi.updateWebhookSetting).mockRejectedValue(new Error("Update failed"));
    try {
      await result.current.mutateAsync({
        id: "setting-1",
        data: { isEnabled: true },
      });
    } catch {
      // Expected
    }

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("Case 5: useDeleteWebhookSettingMutation invalidates queries on both onSuccess and onError", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(webhookSettingsApi.deleteWebhookSetting).mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useDeleteWebhookSettingMutation(), { wrapper });

    await result.current.mutateAsync("setting-to-delete");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["webhook-settings"] });

    // Test onError invalidation
    vi.mocked(webhookSettingsApi.deleteWebhookSetting).mockRejectedValue(new Error("Delete failed"));
    try {
      await result.current.mutateAsync("setting-to-delete");
    } catch {
      // Expected
    }

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("Case 6: useTestWebhookSettingMutation invalidates queries on both onSuccess and onError", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(webhookSettingsApi.testWebhookSetting).mockResolvedValue({
      success: true,
      message: "Test ok",
    });

    const { result } = renderHook(() => useTestWebhookSettingMutation(), { wrapper });

    await result.current.mutateAsync({
      provider: "DISCORD",
      webhookUrl: "https://discord.com/api/webhooks/1/2",
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["webhook-settings"] });

    // Test onError invalidation
    vi.mocked(webhookSettingsApi.testWebhookSetting).mockRejectedValue(new Error("Test failed"));
    try {
      await result.current.mutateAsync({
        provider: "DISCORD",
        webhookUrl: "https://discord.com/api/webhooks/1/2",
      });
    } catch {
      // Expected
    }

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });
});
