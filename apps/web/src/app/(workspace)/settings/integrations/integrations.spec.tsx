import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import IntegrationsLayout from "./layout";
import WebhooksSettingsPage from "./webhooks/page";

let mockPathname = "/settings/integrations/ai";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

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
  AiSettingsTab: () => <div data-testid="ai-settings-tab" />,
  WebhookSettingsTable: () => <div data-testid="webhooks-table" />,
  WebhookModal: () => null,
  DeleteWebhookModal: () => null,
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "settings.integrations.title": "Integrations & AI",
        "settings.integrations.description": "Manage AI & webhooks",
        "settings.integrations.tabs.ai": "AI Provider",
        "settings.integrations.tabs.webhooks": "Webhooks",
        "settings.integrations.webhooks.addButton": "Add Webhook",
      };
      return dict[key] || key;
    },
  }),
}));

describe("IntegrationsLayout & WebhooksSettingsPage RBAC Guard", () => {
  beforeEach(() => {
    mockPathname = "/settings/integrations/ai";
    mockCanManageIntegrations = true;
    capturedWebhookQueryOptions = undefined;
  });

  it("blocks access in IntegrationsLayout and disables webhook query when WebhooksSettingsPage mounts standalone while unauthorized", () => {
    mockCanManageIntegrations = false;

    const { unmount } = render(
      <IntegrationsLayout>
        <WebhooksSettingsPage />
      </IntegrationsLayout>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "You do not have permission to access this section. Please contact your administrator if you need access.",
    );
    expect(screen.queryByTestId("webhooks-table")).not.toBeInTheDocument();
    unmount();

    // Direct page render also keeps API query disabled
    render(<WebhooksSettingsPage />);
    expect(capturedWebhookQueryOptions).toEqual({ enabled: false });
    expect(screen.queryByTestId("webhooks-table")).not.toBeInTheDocument();
  });

  it("renders AI Provider tab first and Webhooks second with dedicated links when authorized", () => {
    mockPathname = "/settings/integrations/webhooks";
    mockCanManageIntegrations = true;

    render(
      <IntegrationsLayout>
        <WebhooksSettingsPage />
      </IntegrationsLayout>,
    );

    const links = screen.getAllByRole("link");
    expect(links.map((el) => el.getAttribute("href"))).toEqual([
      "/settings/integrations/ai",
      "/settings/integrations/webhooks",
    ]);
    expect(links.map((el) => el.textContent?.trim())).toEqual([
      "AI Provider",
      "Webhooks",
    ]);

    expect(capturedWebhookQueryOptions).toEqual({ enabled: true });
    expect(screen.getByTestId("webhooks-table")).toBeInTheDocument();
    expect(screen.getByText("Add Webhook")).toBeInTheDocument();
  });
});
