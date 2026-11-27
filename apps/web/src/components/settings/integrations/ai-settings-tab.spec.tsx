import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { OrganizationAiOverviewResponse } from "@haihire/shared";
import { AiSettingsTab } from "./ai-settings-tab";

let mockOverview: OrganizationAiOverviewResponse;
const mockUpdatePolicyMutateAsync = vi.fn();
const mockCreateConnMutateAsync = vi.fn();
const mockUpdateConnMutateAsync = vi.fn();
const mockDeleteConnMutateAsync = vi.fn();
const mockTestConnMutateAsync = vi.fn();
const mockUpdateRoutesMutateAsync = vi.fn();
const mockTestRouteMutateAsync = vi.fn();

vi.mock("@/hooks/use-ai-setting-queries", () => ({
  useAiOverviewQuery: () => ({
    data: mockOverview,
    isLoading: false,
  }),
  useUpdateAiPolicyMutation: () => ({
    mutateAsync: mockUpdatePolicyMutateAsync,
    isPending: false,
  }),
  useCreateAiConnectionMutation: () => ({
    mutateAsync: mockCreateConnMutateAsync,
    isPending: false,
  }),
  useUpdateAiConnectionMutation: () => ({
    mutateAsync: mockUpdateConnMutateAsync,
    isPending: false,
  }),
  useDeleteAiConnectionMutation: () => ({
    mutateAsync: mockDeleteConnMutateAsync,
    isPending: false,
  }),
  useTestAiConnectionMutation: () => ({
    mutateAsync: mockTestConnMutateAsync,
    isPending: false,
  }),
  useUpdateAiRoutesMutation: () => ({
    mutateAsync: mockUpdateRoutesMutateAsync,
    isPending: false,
  }),
  useTestAiRouteMutation: () => ({
    mutateAsync: mockTestRouteMutateAsync,
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
        "settings.integrations.ai.title": "AI Gateway & API Key Routing",
        "settings.integrations.ai.activeConnectionsBadge": `${params?.active ?? 0}/${params?.total ?? 0} active`,
        "settings.integrations.ai.enabledLabel": "Enable AI features",
        "settings.integrations.ai.autoScoreLabel":
          "Automatically score new applications",
        "settings.integrations.ai.policySaved": "Policy saved.",
        "settings.integrations.ai.securityNote": "AES-256-GCM encrypted",
        "settings.integrations.ai.connectionsTitle": "API Keys & Connections",
        "settings.integrations.ai.addConnectionButton": "Add API Key",
        "settings.integrations.ai.emptyConnectionsTitle": "No connections yet",
        "settings.integrations.ai.emptyConnectionsDesc": "Add your first key",
        "settings.integrations.ai.disabledBadge": "Disabled",
        "settings.integrations.ai.statusHealthy": "Healthy",
        "settings.integrations.ai.statusError": "Error",
        "settings.integrations.ai.statusUntested": "Untested",
        "settings.integrations.ai.cooldownBadge": `Cooldown ${params?.sec ?? 0}s`,
        "settings.integrations.ai.toggleConnectionLabel": "Toggle connection",
        "settings.integrations.ai.testButton": "Test connection",
        "settings.integrations.ai.testingButton": "Testing...",
        "settings.integrations.ai.testSuccess": `Connected to ${params?.model ?? ""} in ${params?.latencyMs ?? 0} ms.`,
        "settings.integrations.ai.deleteConfirmTitle": "Remove AI Connection",
        "settings.integrations.ai.deleteConfirmMessage": `Delete ${params?.name ?? ""}?`,
        "settings.integrations.ai.deleteInUseWarning": `In use by: ${params?.routes ?? ""}`,
        "settings.integrations.ai.createConnectionTitle": "Add AI API Key",
        "settings.integrations.ai.editConnectionTitle": "Edit AI Connection",
        "settings.integrations.ai.connectionDesc": "Configure key",
        "settings.integrations.ai.createConnectionButton": "Create connection",
        "settings.integrations.ai.connectionCreated": "Created.",
        "settings.integrations.ai.connectionUpdated": "Updated.",
        "settings.integrations.ai.connectionDeleted": "Deleted.",
        "settings.integrations.ai.connectionNameLabel": "Connection Name",
        "settings.integrations.ai.connectionNamePlaceholder":
          "e.g. Gemini Flash Primary",
        "settings.integrations.ai.providerTitle": "Provider",
        "settings.integrations.ai.modelTitle": "Default Model",
        "settings.integrations.ai.modelGroupRecommended": "Recommended",
        "settings.integrations.ai.modelGroupOther": "Other models",
        "settings.integrations.ai.modelSearchPlaceholder": "Search models...",
        "settings.integrations.ai.browseModelsLink": "Browse all models",
        "settings.integrations.ai.apiKeyLabel": "API Key",
        "settings.integrations.ai.apiKeyKeepHint": "Leave blank to keep",
        "settings.integrations.ai.apiKeyOptionalHint": "Optional",
        "settings.integrations.ai.apiKeyPlaceholder": "Enter API key...",
        "settings.integrations.ai.getKeyLink": "Get a key",
        "settings.integrations.ai.advancedGatewayToggle":
          "Advanced options (Custom gateway URL)",
        "settings.integrations.ai.baseUrlLabel": "Endpoint Base URL",
        "settings.integrations.ai.baseUrlOptionalHint": "Optional",
        "settings.integrations.ai.baseUrlPlaceholder":
          "http://localhost:11434/v1",
        "settings.integrations.ai.routingTitle":
          "Feature Routing & Proxy Rules",
        "settings.integrations.ai.routesSaved": "Routing saved.",
        "settings.integrations.ai.featureToggleSaved": "Feature updated.",
        "settings.integrations.ai.globalDefaultTitle":
          "Organization Default Route",
        "settings.integrations.ai.globalDefaultDesc": "Default fallback",
        "settings.integrations.ai.configureButton": "Configure",
        "settings.integrations.ai.inheritBadge": "Organization default",
        "settings.integrations.ai.routeTargetCount": `${params?.mode ?? ""} · ${params?.count ?? 0} keys`,
        "settings.integrations.ai.testRouteButton": "Test Proxy",
        "settings.integrations.ai.testingRouteButton": "Testing...",
        "settings.integrations.ai.routeTestOk": `Proxy healthy (${params?.ok ?? 0}/${params?.total ?? 0})`,
        "settings.integrations.ai.routeTestFailed": `Failed (${params?.total ?? 0})`,
        "settings.integrations.ai.routeResultLatency": `${params?.ms ?? 0} ms`,
        "settings.integrations.ai.modeLabel": "Routing Mode",
        "settings.integrations.ai.targetsLabel": "Assigned Connections",
        "settings.integrations.ai.featureEnableLabel": "Toggle feature AI",
        "settings.integrations.ai.selectConnectionPlaceholder":
          "Select API connection...",
        "settings.integrations.ai.useConnectionDefaultModel": "Default",
        "settings.integrations.ai.modelOverrideLabel": "Override model",
        "settings.integrations.ai.addTargetLabel":
          "+ Add connection to proxy pool...",
        "settings.integrations.ai.weightLabel": "Weight",
        "settings.integrations.ai.dragToReorderLabel": "Drag to reorder",
        "settings.integrations.ai.removeTargetLabel": "Remove target",
        "settings.integrations.ai.noTargetsHint": "No connections selected",
        "settings.integrations.ai.inheritingDefaultSummary": `Inheriting: ${params?.mode ?? ""} (${params?.count ?? 0} connections)`,
        "settings.integrations.ai.inheritingDefaultEmpty":
          "No default connections configured above yet.",
        "settings.integrations.ai.disabledLockNotice":
          "AI features are turned off. Re-enable AI above to edit API keys and proxy routing.",
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
        "settings.integrations.ai.modes.INHERIT_DEFAULT":
          "Inherit Organization Default",
        "settings.integrations.ai.modes.INHERIT_DEFAULT_DESC":
          "Uses default route",
        "settings.integrations.ai.modes.SINGLE": "Single Connection",
        "settings.integrations.ai.modes.SINGLE_DESC": "Fixed key",
        "settings.integrations.ai.modes.FAILOVER": "Failover Proxy",
        "settings.integrations.ai.modes.FAILOVER_DESC": "Priority failover",
        "settings.integrations.ai.modes.LOAD_BALANCE": "Load Balance Proxy",
        "settings.integrations.ai.modes.LOAD_BALANCE_DESC": "Weighted pool",
        "settings.integrations.ai.modesShort.SINGLE": "Single key",
        "settings.integrations.ai.modesShort.FAILOVER": "Failover",
        "settings.integrations.ai.modesShort.LOAD_BALANCE": "Load balance",
        "settings.integrations.ai.features.APPLICATION_SCORING":
          "CV & Application AI Evaluation",
        "settings.integrations.ai.features.APPLICATION_SCORING_DESC":
          "Evaluate resumes",
        "settings.integrations.ai.features.SCREENING_QUESTIONS":
          "Job Screening Question Generator",
        "settings.integrations.ai.features.SCREENING_QUESTIONS_DESC":
          "Generate questions",
        "settings.integrations.ai.features.SCORING_CRITERIA":
          "Job Scoring Rubric Generator",
        "settings.integrations.ai.features.SCORING_CRITERIA_DESC":
          "Generate criteria",
        "common.edit": "Edit",
        "common.delete": "Delete",
        "common.saveChanges": "Save changes",
        "common.cancel": "Cancel",
        "common.close": "Close",
      };
      return dict[key] || key;
    },
  }),
}));

const conn1Id = "11111111-1111-4111-8111-111111111111";
const conn2Id = "22222222-2222-4222-8222-222222222222";

describe("AiSettingsTab (Option 1 Refactored UI)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOverview = {
      policy: {
        id: "pol-1",
        organizationId: "org-1",
        isEnabled: true,
        autoScoreApplications: false,
        defaultRouteMode: "SINGLE",
        defaultRouteTargets: [
          { connectionId: conn1Id, modelId: null, weight: 1 },
        ],
        updatedAt: "2026-11-27T00:00:00Z",
      },
      connections: [
        {
          id: conn1Id,
          organizationId: "org-1",
          name: "Gemini Primary",
          provider: "GEMINI",
          defaultModelId: "gemini-4-hydrogen",
          baseUrl: null,
          hasApiKey: true,
          apiKeyLast4: "9876",
          isEnabled: true,
          lastStatus: "HEALTHY",
          lastError: null,
          lastTestedAt: "2026-11-27T00:00:00Z",
          lastUsedAt: null,
          consecutiveFailures: 0,
          cooldownRemainingSec: 0,
          createdAt: "2026-11-27T00:00:00Z",
          updatedAt: "2026-11-27T00:00:00Z",
        },
        {
          id: conn2Id,
          organizationId: "org-1",
          name: "OpenAI Backup",
          provider: "OPENAI",
          defaultModelId: "gpt-6.2-sol",
          baseUrl: null,
          hasApiKey: true,
          apiKeyLast4: "1234",
          isEnabled: false,
          lastStatus: "ERROR",
          lastError: "429 Rate Limit",
          lastTestedAt: null,
          lastUsedAt: null,
          consecutiveFailures: 2,
          cooldownRemainingSec: 45,
          createdAt: "2026-11-27T00:00:00Z",
          updatedAt: "2026-11-27T00:00:00Z",
        },
      ],
      routes: [
        {
          feature: "APPLICATION_SCORING",
          isEnabled: true,
          mode: "INHERIT_DEFAULT",
          targets: [],
        },
        {
          feature: "SCREENING_QUESTIONS",
          isEnabled: false,
          mode: "SINGLE",
          targets: [
            { connectionId: conn2Id, modelId: "gpt-5-mini", weight: 1 },
          ],
        },
        {
          feature: "SCORING_CRITERIA",
          isEnabled: true,
          mode: "INHERIT_DEFAULT",
          targets: [],
        },
      ],
    };

    mockUpdatePolicyMutateAsync.mockResolvedValue(mockOverview.policy);
    mockCreateConnMutateAsync.mockResolvedValue(mockOverview.connections[0]);
    mockUpdateConnMutateAsync.mockResolvedValue(mockOverview.connections[0]);
    mockDeleteConnMutateAsync.mockResolvedValue({ deleted: true });
    mockTestConnMutateAsync.mockResolvedValue({
      ok: true,
      latencyMs: 120,
      model: "gpt-6.2-sol",
    });
    mockUpdateRoutesMutateAsync.mockResolvedValue(mockOverview.routes);
    mockTestRouteMutateAsync.mockResolvedValue({
      feature: "GLOBAL_DEFAULT",
      mode: "SINGLE",
      ok: true,
      totalLatencyMs: 180,
      succeededConnectionId: conn1Id,
      attempts: [
        {
          connectionId: conn1Id,
          connectionName: "Gemini Primary",
          provider: "GEMINI",
          modelId: "gemini-4-hydrogen",
          ok: true,
          latencyMs: 180,
        },
      ],
    });
  });

  it("opens Add API Key modal with collapsed Base URL for OpenAI, tests, and creates connection", async () => {
    render(<AiSettingsTab />);

    expect(screen.getByText("1/2 active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add API Key" }));

    expect(
      screen.queryByLabelText(/Endpoint Base URL/i),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Advanced options (Custom gateway URL)",
      }),
    );
    expect(screen.getByLabelText(/Endpoint Base URL/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Connection Name"), {
      target: { value: "OpenAI Fast Key" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /OpenAI GPT models/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter API key..."), {
      target: { value: "sk-test-new-9999" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    await waitFor(() => {
      expect(mockTestConnMutateAsync).toHaveBeenCalledWith({
        provider: "OPENAI",
        modelId: "gpt-6.2-sol",
        apiKey: "sk-test-new-9999",
        baseUrl: null,
      });
    });
    expect(
      screen.getByText("Connected to gpt-6.2-sol in 120 ms."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create connection" }));
    await waitFor(() => {
      expect(mockCreateConnMutateAsync).toHaveBeenCalledWith({
        name: "OpenAI Fast Key",
        provider: "OPENAI",
        defaultModelId: "gpt-6.2-sol",
        apiKey: "sk-test-new-9999",
        baseUrl: null,
        isEnabled: true,
      });
    });
  });

  it("saves connection and feature toggles immediately and tests organization default route", async () => {
    render(<AiSettingsTab />);

    fireEvent.click(
      screen.getByRole("switch", { name: "Toggle connection: Gemini Primary" }),
    );
    await waitFor(() => {
      expect(mockUpdateConnMutateAsync).toHaveBeenCalledWith({
        id: conn1Id,
        data: { isEnabled: false },
      });
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Delete: Gemini Primary" }),
    );
    expect(
      screen.getByText("In use by: Organization Default Route"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Toggle Screening Questions feature ON -> saves immediately via updateRoutesMutation
    fireEvent.click(
      screen.getByRole("switch", {
        name: "Toggle feature AI: Job Screening Question Generator",
      }),
    );
    await waitFor(() => {
      expect(mockUpdateRoutesMutateAsync).toHaveBeenCalledWith({
        routes: [
          {
            feature: "APPLICATION_SCORING",
            isEnabled: true,
            mode: "INHERIT_DEFAULT",
            targets: [],
          },
          {
            feature: "SCREENING_QUESTIONS",
            isEnabled: true,
            mode: "SINGLE",
            targets: [
              { connectionId: conn2Id, modelId: "gpt-5-mini", weight: 1 },
            ],
          },
          {
            feature: "SCORING_CRITERIA",
            isEnabled: true,
            mode: "INHERIT_DEFAULT",
            targets: [],
          },
        ],
      });
    });

    // Test Organization Default Proxy directly from the summary bar
    fireEvent.click(screen.getByRole("button", { name: "Test Proxy" }));
    await waitFor(() => {
      expect(mockTestRouteMutateAsync).toHaveBeenCalledWith("GLOBAL_DEFAULT");
    });
    expect(screen.getByText("Proxy healthy (1/1)")).toBeInTheDocument();
  });

  it("opens SlideOver drawer for FAILOVER route with drag handles and saves changes", async () => {
    mockOverview.policy.defaultRouteMode = "FAILOVER";
    mockOverview.policy.defaultRouteTargets = [
      { connectionId: conn1Id, modelId: null, weight: 1 },
      { connectionId: conn2Id, modelId: "gpt-6.2-sol", weight: 1 },
    ];

    render(<AiSettingsTab />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Configure: Organization Default Route",
      }),
    );

    // Drawer displays drag handles and NO legacy Up/Down arrows
    expect(
      screen.getAllByRole("button", { name: "Drag to reorder" }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Move up" }),
    ).not.toBeInTheDocument();

    // Save changes is disabled until something changes
    const saveBtn = screen.getByRole("button", { name: "Save changes" });
    expect(saveBtn).toBeDisabled();

    // Switch mode to Load Balance Proxy -> Save becomes enabled and persists policy
    fireEvent.click(screen.getByRole("radio", { name: "Load Balance Proxy" }));
    expect(saveBtn).toBeEnabled();

    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(mockUpdatePolicyMutateAsync).toHaveBeenCalledWith({
        isEnabled: true,
        autoScoreApplications: false,
        defaultRouteMode: "LOAD_BALANCE",
        defaultRouteTargets: [
          { connectionId: conn1Id, modelId: null, weight: 1 },
          { connectionId: conn2Id, modelId: "gpt-6.2-sol", weight: 1 },
        ],
      });
    });
  });

  it("locks all controls below when Master AI is OFF and disables Configure when a feature is OFF", () => {
    // Part A: Master AI ON, Screening Questions OFF -> its Configure button is disabled
    const { rerender } = render(<AiSettingsTab />);
    expect(
      screen.getByRole("button", {
        name: "Configure: Job Screening Question Generator",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Configure: CV & Application AI Evaluation",
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("switch", {
        name: "Automatically score new applications",
      }),
    ).toBeEnabled();

    // Part B: Master AI OFF -> lock notice shown and ALL controls below disabled
    mockOverview = {
      ...mockOverview,
      policy: {
        ...mockOverview.policy,
        isEnabled: false,
      },
    };
    rerender(<AiSettingsTab />);

    expect(
      screen.getByText(
        "AI features are turned off. Re-enable AI above to edit API keys and proxy routing.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("switch", { name: "Enable AI features" }),
    ).toBeEnabled();

    expect(
      screen.getByRole("switch", {
        name: "Automatically score new applications",
      }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add API Key" })).toBeDisabled();
    expect(
      screen.getByRole("switch", { name: "Toggle connection: Gemini Primary" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Test connection: Gemini Primary" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Edit: Gemini Primary" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Delete: Gemini Primary" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Test Proxy" })).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Configure: Organization Default Route",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("switch", {
        name: "Toggle feature AI: CV & Application AI Evaluation",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Configure: CV & Application AI Evaluation",
      }),
    ).toBeDisabled();
  });
});
