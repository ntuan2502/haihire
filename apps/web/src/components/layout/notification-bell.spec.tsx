import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NotificationBell } from "./notification-bell";
import { api } from "@/lib/api/client";

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("@/hooks/use-has-permission", () => ({ useHasPermission: () => true }));
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params?.candidate && params?.job) {
        return `${params.candidate} applied for ${params.job}`;
      }
      if (params?.round !== undefined) {
        return `Round ${params.round}`;
      }
      return key;
    },
  }),
}));
vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { items: [], unreadCount: 0 } }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it("opens the notification menu and shows its empty state", async () => {
  vi.mocked(api.get).mockResolvedValueOnce({
    data: { items: [], unreadCount: 0 },
  });

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <NotificationBell organizationId="org-1" userId="user-1" />
    </QueryClientProvider>,
  );

  fireEvent.pointerDown(
    screen.getByRole("button", { name: "settings.tabs.notifications" }),
    { button: 0, ctrlKey: false },
  );
  expect(await screen.findByText("notificationInbox.empty")).toBeVisible();
});

it("renders enriched context, relative timestamps, filters unread items, marks read on click, and navigates", async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();

  vi.mocked(api.get).mockResolvedValue({
    data: {
      unreadCount: 1,
      items: [
        {
          id: "notif-1",
          kind: "applicationReceived",
          resourceId: "app-42",
          createdAt: fiveMinutesAgo,
          readAt: null,
          candidateName: "Nguyen Van An",
          jobTitle: "Senior Backend Engineer",
        },
        {
          id: "notif-2",
          kind: "interviewScheduled",
          resourceId: "int-7",
          createdAt: twoHoursAgo,
          readAt: twoHoursAgo,
          candidateName: "Tran Thi Binh",
          jobTitle: "Product Designer",
          scheduledAt: "2026-11-20T07:30:00.000Z",
          round: 2,
        },
      ],
    },
  });

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <NotificationBell organizationId="org-1" userId="user-1" />
    </QueryClientProvider>,
  );

  const trigger = await screen.findByRole("button", {
    name: "settings.tabs.notifications (1)",
  });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });

  expect(
    await screen.findByText(
      "Nguyen Van An applied for Senior Backend Engineer",
    ),
  ).toBeVisible();
  expect(screen.getByText("Tran Thi Binh • Product Designer")).toBeVisible();
  expect(screen.getByText("5m ago")).toBeVisible();
  expect(screen.getByText("2h ago")).toBeVisible();

  // Switch to Unread filter tab
  fireEvent.click(
    screen.getByRole("button", { name: /notificationInbox\.unread/i }),
  );
  expect(
    screen.getByText("Nguyen Van An applied for Senior Backend Engineer"),
  ).toBeVisible();
  expect(
    screen.queryByText("Tran Thi Binh • Product Designer"),
  ).not.toBeInTheDocument();

  // Mark all read button works directly from header
  fireEvent.click(
    screen.getByRole("button", { name: "notificationInbox.readAll" }),
  );
  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith("/notifications/read");
  });

  // Click unread notification -> marks read and navigates to application detail
  fireEvent.click(screen.getByText("notificationInbox.applicationReceived"));
  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith("/notifications/notif-1/read");
  });
  expect(mockPush).toHaveBeenCalledWith("/applications/app-42");
});

it("blocks navigation on cancelled interview notifications while keeping them readable", async () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();

  vi.mocked(api.get).mockResolvedValue({
    data: {
      unreadCount: 1,
      items: [
        {
          id: "notif-cancel-1",
          kind: "interviewCancelled",
          resourceId: "int-cancelled",
          createdAt: tenMinutesAgo,
          readAt: null,
          candidateName: "Le Minh Cuong",
          jobTitle: "Platform Engineer",
        },
      ],
    },
  });

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <NotificationBell organizationId="org-1" userId="user-1" />
    </QueryClientProvider>,
  );

  const trigger = await screen.findByRole("button", {
    name: "settings.tabs.notifications (1)",
  });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });

  const itemTitle = await screen.findByText(
    "notificationInbox.interviewCancelled",
  );
  fireEvent.click(itemTitle);

  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith(
      "/notifications/notif-cancel-1/read",
    );
  });
  expect(mockPush).not.toHaveBeenCalled();

  fireEvent.click(
    screen.getByRole("button", { name: "notificationInbox.viewAll" }),
  );
  expect(mockPush).toHaveBeenCalledWith("/notifications");
});
