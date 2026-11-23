import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Permission, WebsiteNotificationInbox } from "@haihire/shared";
import NotificationsPage from "./page";
import { api } from "@/lib/api/client";

const { mockPush, mockReplace, mockSearchParams, mockPermissions } = vi.hoisted(
  () => ({
    mockPush: vi.fn(),
    mockReplace: vi.fn(),
    mockSearchParams: { value: new URLSearchParams() },
    mockPermissions: { allowed: null as Set<Permission> | null },
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/notifications",
  useSearchParams: () => mockSearchParams.value,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "admin@haihire.vn",
      firstName: "Hai",
      lastName: "Admin",
      name: "Hai Admin",
      role: "ADMIN",
      organizationId: "org-1",
      organization: {
        id: "org-1",
        name: "HaiHire Corp",
        slug: "haihire-corp",
      },
    },
  }),
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: (permission: Permission) => {
    if (mockPermissions.allowed === null) return true;
    return mockPermissions.allowed.has(permission);
  },
}));

vi.mock("@/components/providers/localization-provider", () => ({
  useLocalization: () => ({
    localization: {
      defaultLanguage: "en",
      timezone: "Asia/Ho_Chi_Minh",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24H",
      nameDisplayOrder: "FIRST_LAST",
      defaultCurrency: "USD",
    },
    isConfigured: true,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string, params?: Record<string, string | number>) => {
      if (params?.candidate && params?.job) {
        return `${params.candidate} applied for ${params.job}`;
      }
      if (params?.workspace) {
        return `Workspace: ${params.workspace}`;
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
    get: vi.fn(),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationsPage />
    </QueryClientProvider>,
  );
}

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.value = new URLSearchParams();
    mockPermissions.allowed = null;
  });

  it("renders date-grouped notifications, supports read/unread toggles, blocks cancelled navigation, and routes to detail and settings", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-24T05:10:00.000Z"));
    try {
      const now = new Date();
      const tenMinsAgo = new Date(now.getTime() - 10 * 60_000).toISOString();
      const yesterdayIso = new Date(
        now.getTime() - 24 * 60 * 60_000,
      ).toISOString();
      const fourDaysAgo = new Date(
        now.getTime() - 4 * 24 * 60 * 60_000,
      ).toISOString();

      const inboxData: WebsiteNotificationInbox = {
        unreadCount: 1,
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
        items: [
          {
            id: "notif-today",
            kind: "applicationReceived",
            resourceId: "app-42",
            createdAt: tenMinsAgo,
            readAt: null,
            candidateName: "Nguyen Van An",
            jobTitle: "Senior Backend Engineer",
          },
          {
            id: "notif-yesterday",
            kind: "interviewScheduled",
            resourceId: "int-7",
            createdAt: yesterdayIso,
            readAt: yesterdayIso,
            candidateName: "Tran Thi Binh",
            jobTitle: "Product Designer",
            scheduledAt: "2026-11-20T07:30:00.000Z",
            round: 2,
          },
          {
            id: "notif-earlier-cancel",
            kind: "interviewCancelled",
            resourceId: "int-cancelled",
            createdAt: fourDaysAgo,
            readAt: fourDaysAgo,
            candidateName: "Le Minh Cuong",
            jobTitle: "QA Lead",
          },
        ],
      };

      vi.mocked(api.get).mockResolvedValue({ data: inboxData });

      renderPage();

      expect(
        await screen.findByText("Workspace: HaiHire Corp"),
      ).toBeInTheDocument();
      expect(
        await screen.findByText("notificationInbox.groupToday"),
      ).toBeVisible();
      expect(
        screen.getByText("notificationInbox.groupYesterday"),
      ).toBeVisible();
      expect(screen.getByText("notificationInbox.groupEarlier")).toBeVisible();
      expect(
        screen.getByText("Nguyen Van An applied for Senior Backend Engineer"),
      ).toBeVisible();
      expect(screen.getByText("10m ago")).toBeVisible();
      expect(screen.getByText("20/11/2026 14:30 · Round 2")).toBeVisible();

      // Toggling unread on a read notification calls /unread without navigating
      const markUnreadBtns = screen.getAllByRole("button", {
        name: "notificationInbox.markAsUnread",
      });
      fireEvent.click(markUnreadBtns[0]);
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "/notifications/notif-yesterday/unread",
        );
      });
      expect(mockPush).not.toHaveBeenCalled();

      // Toggling read on an unread notification calls /read without navigating
      const markReadBtn = screen.getByRole("button", {
        name: "notificationInbox.markAsRead",
      });
      fireEvent.click(markReadBtn);
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "/notifications/notif-today/read",
        );
      });
      expect(mockPush).not.toHaveBeenCalled();

      // Clicking cancelled interview text does NOT navigate
      fireEvent.click(screen.getByText("Le Minh Cuong • QA Lead"));
      expect(mockPush).not.toHaveBeenCalled();

      // Clicking navigable notification marks read & pushes detail route
      fireEvent.click(
        screen.getByText("Nguyen Van An applied for Senior Backend Engineer"),
      );
      expect(mockPush).toHaveBeenCalledWith("/applications/app-42");

      // Mark all read & settings header buttons work
      fireEvent.click(
        screen.getByRole("button", { name: "notificationInbox.readAll" }),
      );
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith("/notifications/read");
      });

      fireEvent.click(
        screen.getByRole("button", { name: "notificationInbox.settings" }),
      );
      expect(mockPush).toHaveBeenCalledWith("/account#notifications");
    } finally {
      vi.useRealTimers();
    }
  });

  it("syncs status, kind, and page filters with API query params and URL search params", async () => {
    mockSearchParams.value = new URLSearchParams(
      "status=unread&kind=interviewScheduled&page=2",
    );
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [],
        unreadCount: 0,
        total: 0,
        page: 2,
        limit: 20,
        totalPages: 0,
      },
    });

    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/notifications", {
        params: {
          page: 2,
          limit: 20,
          status: "unread",
          kind: "interviewScheduled",
        },
      });
    });

    // Empty filtered message renders with Clear Filters button
    expect(
      await screen.findByText("notificationInbox.emptyFiltered"),
    ).toBeVisible();

    const readPill = screen.getByRole("button", {
      name: "notificationInbox.read",
    });
    fireEvent.click(readPill);
    expect(mockReplace).toHaveBeenCalledWith(
      "/notifications?status=read&kind=interviewScheduled",
      { scroll: false },
    );

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "notificationInbox.clearFilters",
      })[0],
    );
    expect(mockReplace).toHaveBeenCalledWith("/notifications", {
      scroll: false,
    });
  });

  it("omits disallowed RBAC notification kinds from filter options and renders retry on error", async () => {
    mockPermissions.allowed = new Set<Permission>(["interview:view"]);
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network fail"));

    renderPage();

    expect(
      await screen.findByText("notificationInbox.loadError"),
    ).toBeVisible();

    const kindTrigger = screen.getByRole("button", {
      name: "notificationInbox.filterKindAll",
    });
    fireEvent.click(kindTrigger);

    expect(
      await screen.findByRole("option", {
        name: "notificationInbox.interviewScheduled",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "notificationInbox.applicationReceived",
      }),
    ).not.toBeInTheDocument();

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        items: [],
        unreadCount: 0,
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "notificationInbox.retry" }),
    );
    expect(await screen.findByText("notificationInbox.empty")).toBeVisible();
  });

  it("renders pagination controls and updates URL page param on next page click", async () => {
    const createdAt = new Date().toISOString();
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [
          {
            id: "notif-page-1",
            kind: "applicationReceived",
            resourceId: "app-99",
            createdAt,
            readAt: null,
            candidateName: "Pham Minh D",
            jobTitle: "Frontend Lead",
          },
        ],
        unreadCount: 1,
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      },
    });

    renderPage();

    expect(
      await screen.findByText("notificationInbox.groupToday"),
    ).toBeVisible();
    const nextBtn = screen.getByRole("button", { name: "common.next" });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    expect(mockReplace).toHaveBeenCalledWith("/notifications?page=2", {
      scroll: false,
    });
  });
});
