import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import IntegrationsSettingsPage from "./page";

let mockCanManageIntegrations = true;
vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanManageIntegrations,
}));

let capturedWebhookQueryOptions: { enabled?: boolean } | undefined;
vi.mock("@/hooks/use-webhook-setting-queries", () => ({
  useWebhookSettingsQuery: (options?: { enabled?: boolean }) => {
    capturedWebhookQueryOptions = options;
    return {
      data: [],
      isLoading: false,
    };
  },
  useCreateWebhookSettingMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateWebhookSettingMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteWebhookSettingMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useTestWebhookSettingMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/components/settings/integrations", () => ({
  WebhookSettingsTable: () => <div data-testid="webhooks-table" />,
  WebhookModal: () => null,
  DeleteWebhookModal: () => null,
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "settings.integrations.title": "Integrations & Webhooks",
        "settings.integrations.description": "Manage webhooks",
        "settings.integrations.accessDenied":
          "You do not have permission to manage integrations and webhooks.",
        "settings.integrations.tabs.webhooks": "Webhooks",
        "settings.integrations.webhooks.addButton": "Add Webhook",
      };
      return dict[key] || key;
    },
  }),
}));

describe("IntegrationsSettingsPage RBAC Guard", () => {
  beforeEach(() => {
    mockCanManageIntegrations = true;
    capturedWebhookQueryOptions = undefined;
  });

  it("blocks access and disables query when user lacks settings:manage_integrations", () => {
    mockCanManageIntegrations = false;

    render(<IntegrationsSettingsPage />);

    expect(capturedWebhookQueryOptions).toEqual({ enabled: false });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "You do not have permission to manage integrations and webhooks.",
    );
    expect(screen.queryByTestId("webhooks-table")).not.toBeInTheDocument();
  });

  it("enables query and renders integrations workspace when authorized", () => {
    mockCanManageIntegrations = true;

    render(<IntegrationsSettingsPage />);

    expect(capturedWebhookQueryOptions).toEqual({ enabled: true });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("webhooks-table")).toBeInTheDocument();
    expect(screen.getByText("Add Webhook")).toBeInTheDocument();
  });
});
