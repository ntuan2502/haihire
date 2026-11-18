import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NotificationBell } from "./notification-bell";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/use-has-permission", () => ({ useHasPermission: () => true }));
vi.mock("@/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { items: [], unreadCount: 0 } }),
  },
}));

it("opens the notification menu and shows its empty state", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NotificationBell organizationId="org-1" userId="user-1" />
    </QueryClientProvider>,
  );

  fireEvent.pointerDown(
    screen.getByRole("button", { name: "settings.tabs.notifications" }),
    { button: 0, ctrlKey: false },
  );
  expect(await screen.findByText("notificationInbox.empty")).toBeVisible();
});
