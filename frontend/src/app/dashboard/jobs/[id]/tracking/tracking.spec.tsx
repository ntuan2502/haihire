import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JobTrackingPage from "./page";
import { SourcingChannel } from "@haihire/shared";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "job-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/jobs/job-1/tracking",
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@example.com", organizationId: "org-1" },
    canEdit: true,
  }),
}));

vi.mock("@/hooks/use-organization-queries", () => ({
  useMyOrg: () => ({
    data: { slug: "acme-corp" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useJob: (id: string) => ({
    data: { id, title: "Senior Frontend Engineer" },
    isLoading: false,
  }),
  useAllJobs: () => ({
    data: [{ id: "job-1", title: "Senior Frontend Engineer" }],
    isLoading: false,
  }),
}));

const mockLinksData = {
  data: [
    {
      id: "link-1",
      organizationId: "org-1",
      name: "LinkedIn Hiring Campaign",
      token: "lnk-linkedin-1",
      source: SourcingChannel.LINKEDIN,
      customSource: null,
      jobId: "job-1",
      jobTitle: "Senior Frontend Engineer",
      clicksCount: 45,
      applicationsCount: 5,
      conversionRate: 11.11,
      isActive: true,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 15,
  totalPages: 1,
};

vi.mock("@/hooks/use-sourcing-queries", () => ({
  useTrackingLinksQuery: () => ({
    data: mockLinksData,
    isLoading: false,
  }),
  useUpdateTrackingLinkMutation: () => ({
    mutate: vi.fn(),
  }),
  useDeleteTrackingLinkMutation: () => ({
    mutate: vi.fn(),
  }),
  useCreateTrackingLinkMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("JobTrackingPage", () => {
  it("renders search input, new link button, and tracking links table", () => {
    render(<JobTrackingPage />);

    expect(screen.getByPlaceholderText("Tìm kiếm theo tên liên kết, token, chiến dịch...")).toBeDefined();
    expect(screen.getByRole("button", { name: "Tạo liên kết mới" })).toBeDefined();
    expect(screen.getByText("LinkedIn Hiring Campaign")).toBeDefined();
    expect(screen.getByText("?ref=lnk-linkedin-1")).toBeDefined();
    expect(screen.getByText("11.11%")).toBeDefined();
  });

  it("opens create link modal with locked job when clicking new link button", () => {
    render(<JobTrackingPage />);

    const newLinkBtn = screen.getByRole("button", { name: "Tạo liên kết mới" });
    fireEvent.click(newLinkBtn);

    // Modal opens
    expect(screen.getByText("Tạo liên kết theo dõi mới")).toBeDefined();

    // Job selector is locked
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Cố định cho vị trí này")).toBeDefined();
    const jobButton = within(dialog).getByText("Senior Frontend Engineer").closest("button");
    expect(jobButton).toBeDefined();
    expect(jobButton?.hasAttribute("disabled")).toBe(true);
  });
});
