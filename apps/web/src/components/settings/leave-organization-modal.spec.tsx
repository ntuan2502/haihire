import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LeaveOrganizationModal } from "./leave-organization-modal";
import { toast } from "@/lib/toast";

const mockReplace = vi.fn();
const mockRefreshUser = vi.fn().mockResolvedValue(null);
const mockLeaveMutateAsync = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useLeaveOrganizationMutation: () => ({
    mutateAsync: mockLeaveMutateAsync,
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
      if (key === "settings.leaveOrgConfirmTitle") {
        return `Leave ${params?.name ?? ""}?`;
      }
      if (key === "settings.leaveOrgSuccess") {
        return `You have left ${params?.name ?? ""}.`;
      }
      if (key === "errors.ORG_OWNER_CANNOT_LEAVE") {
        return "Translated owner cannot leave error";
      }
      return key;
    },
  }),
}));

function renderModal(
  props: {
    isOpen?: boolean;
    organizationName?: string;
    onClose?: () => void;
  } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const clearSpy = vi.spyOn(client, "clear");
  const result = render(
    <QueryClientProvider client={client}>
      <LeaveOrganizationModal
        isOpen={props.isOpen ?? true}
        organizationName={props.organizationName ?? "Acme Corp"}
        onClose={props.onClose ?? vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { ...result, clearSpy };
}

describe("LeaveOrganizationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /dashboard and switches context when user still belongs to another organization", async () => {
    const onClose = vi.fn();
    mockLeaveMutateAsync.mockResolvedValueOnce({
      success: true,
      organizationId: "org-1",
      organizationName: "Acme Corp",
      message: "Left",
      nextOrganization: { id: "org-2", name: "Beta Inc" },
    });

    const { clearSpy } = renderModal({ onClose });

    expect(screen.getByText("Leave Acme Corp?")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "settings.leaveOrgButton" }),
    );

    await waitFor(() => {
      expect(mockLeaveMutateAsync).toHaveBeenCalledTimes(1);
      expect(clearSpy).toHaveBeenCalled();
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("You have left Acme Corp.");
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to /auth/onboarding when user has no remaining organizations", async () => {
    const onClose = vi.fn();
    mockLeaveMutateAsync.mockResolvedValueOnce({
      success: true,
      organizationId: "org-1",
      organizationName: "Acme Corp",
      message: "Left",
      nextOrganization: null,
    });

    renderModal({ onClose });

    fireEvent.click(
      screen.getByRole("button", { name: "settings.leaveOrgButton" }),
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/onboarding");
    });
  });

  it("displays toast.error and preserves modal open state when leaving fails", async () => {
    const onClose = vi.fn();
    mockLeaveMutateAsync.mockRejectedValueOnce({
      response: {
        data: { code: "ORG_OWNER_CANNOT_LEAVE", message: "Owner cannot leave" },
      },
    });

    renderModal({ onClose });

    fireEvent.click(
      screen.getByRole("button", { name: "settings.leaveOrgButton" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Translated owner cannot leave error",
      );
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
