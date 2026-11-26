import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AiSettingsTab } from "./ai-settings-tab";
import type { OrganizationAiSettingResponse } from "@haihire/shared";

let mockSetting: OrganizationAiSettingResponse | null = null;
const mockUpsertMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockTestMutateAsync = vi.fn();

vi.mock("@/hooks/use-ai-setting-queries", () => ({
  useAiSettingQuery: () => ({
    data: mockSetting,
    isLoading: false,
  }),
  useUpsertAiSettingMutation: () => ({
    mutateAsync: mockUpsertMutateAsync,
    isPending: false,
  }),
  useDeleteAiSettingMutation: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
  useTestAiConnectionMutation: () => ({
    mutateAsync: mockTestMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "settings.integrations.ai.title": "AI Provider Configuration",
        "settings.integrations.ai.description": "Connect your organization AI.",
        "settings.integrations.ai.enabledLabel": "Enable AI features",
        "settings.integrations.ai.providerTitle": "Provider",
        "settings.integrations.ai.providerDesc": "Choose provider",
        "settings.integrations.ai.modelTitle": "Model",
        "settings.integrations.ai.modelDesc": "Choose latest model",
        "settings.integrations.ai.otherModelsLabel": "Other models",
        "settings.integrations.ai.otherModelsPlaceholder":
          "Select another model...",
        "settings.integrations.ai.connectionTitle": "Connection & API Key",
        "settings.integrations.ai.connectionDesc": "Connect API key",
        "settings.integrations.ai.baseUrlLabel": "Endpoint Base URL",
        "settings.integrations.ai.baseUrlPlaceholder":
          "http://localhost:11434/v1",
        "settings.integrations.ai.apiKeyLabel": "API Key",
        "settings.integrations.ai.apiKeyKeepHint":
          "Leave blank to keep current",
        "settings.integrations.ai.apiKeyOptionalHint": "Optional",
        "settings.integrations.ai.apiKeyPlaceholder": "Enter API key...",
        "settings.integrations.ai.getKeyLink": "Get a key",
        "settings.integrations.ai.browseModelsLink": "Browse all models",
        "settings.integrations.ai.testButton": "Test connection",
        "settings.integrations.ai.testingButton": "Testing...",
        "settings.integrations.ai.testSuccess": `Connected to ${params?.model ?? ""} in ${params?.latencyMs ?? 0} ms.`,
        "settings.integrations.ai.saveButton": "Save configuration",
        "settings.integrations.ai.deleteButton": "Remove configuration",
        "settings.integrations.ai.deleteConfirmTitle":
          "Remove AI Configuration",
        "settings.integrations.ai.deleteConfirmMessage": "Confirm delete?",
        "settings.integrations.ai.saveSuccess": "Saved.",
        "settings.integrations.ai.deleteSuccess": "Deleted.",
        "settings.integrations.ai.securityNote":
          "Encrypted at rest with AES-256-GCM.",
        "settings.integrations.ai.providers.OPENAI_DESC": "GPT models",
        "settings.integrations.ai.providers.ANTHROPIC_DESC": "Claude models",
        "settings.integrations.ai.providers.GEMINI_DESC": "Gemini models",
        "settings.integrations.ai.providers.OPENROUTER_DESC": "OpenRouter",
        "settings.integrations.ai.providers.OPENAI_COMPATIBLE_DESC":
          "Custom endpoint",
        "settings.integrations.ai.badges.recommended": "Recommended",
        "settings.integrations.ai.badges.fast": "Fast",
        "settings.integrations.ai.badges.powerful": "Powerful",
        "settings.integrations.ai.badges.low_cost": "Low cost",
        "common.cancel": "Cancel",
      };
      return dict[key] || key;
    },
  }),
}));

describe("AiSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetting = null;
    mockUpsertMutateAsync.mockResolvedValue({});
    mockTestMutateAsync.mockResolvedValue({
      ok: true,
      latencyMs: 142,
      model: "gpt-6.2-sol",
    });
  });

  it("selects latest OpenAI model by default, tests connection, and saves API key", async () => {
    render(<AiSettingsTab />);

    fireEvent.click(screen.getByRole("radio", { name: /OpenAI GPT models/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter API key..."), {
      target: { value: "sk-test-1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    await waitFor(() => {
      expect(mockTestMutateAsync).toHaveBeenCalledWith({
        provider: "OPENAI",
        modelId: "gpt-6.2-sol",
        apiKey: "sk-test-1234",
        baseUrl: null,
      });
    });
    expect(
      screen.getByText("Connected to gpt-6.2-sol in 142 ms."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    await waitFor(() => {
      expect(mockUpsertMutateAsync).toHaveBeenCalledWith({
        provider: "OPENAI",
        modelId: "gpt-6.2-sol",
        apiKey: "sk-test-1234",
        baseUrl: null,
        isEnabled: true,
      });
    });
  });

  it("selects other models from dropdown (no manual text input) and preserves stored key", async () => {
    mockSetting = {
      id: "ai-1",
      organizationId: "org-1",
      provider: "GEMINI",
      modelId: "gemini-4-hydrogen",
      baseUrl: null,
      hasApiKey: true,
      apiKeyLast4: "9876",
      isEnabled: true,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: "2026-11-25T00:00:00Z",
    };

    render(<AiSettingsTab />);

    // Open Other models searchable dropdown and select Gemini 2.5 Pro
    fireEvent.click(screen.getByRole("button", { name: "Other models" }));
    fireEvent.click(
      screen.getByRole("option", { name: "Gemini 2.5 Pro (gemini-2.5-pro)" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    await waitFor(() => {
      expect(mockUpsertMutateAsync).toHaveBeenCalledWith({
        provider: "GEMINI",
        modelId: "gemini-2.5-pro",
        baseUrl: null,
        isEnabled: true,
      });
    });
  });
});
