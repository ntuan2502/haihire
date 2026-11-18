import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ApplicationStats } from "@haihire/shared";
import type { Application, Job, Organization, User } from "@/types";
import { DashboardFrame } from "@/components/layout/dashboard-frame";
import DashboardPage from "./page";

const {
  mockPush,
  mockJobs,
  mockStats,
  mockApps,
  mockCandidates,
  mockInterviews,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockJobs: { data: [] as Job[], isLoading: false },
  mockStats: {
    data: {
      totalApplications: 0,
      byStage: {
        APPLIED: 0,
        SCREENING: 0,
        INTERVIEW: 0,
        OFFER: 0,
        HIRED: 0,
        REJECTED: 0,
      },
      byJob: {},
    } as ApplicationStats,
    isLoading: false,
  },
  mockApps: { data: { data: [] as Application[] }, isLoading: false },
  mockCandidates: { data: { total: 0 }, isLoading: false },
  mockInterviews: { data: { data: [] }, isLoading: false },
}));

const mockOrganization: Organization = {
  id: "org-1",
  name: "HaiHire Corp",
  slug: "haihire-corp",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockUser: User = {
  id: "user-1",
  email: "admin@haihire.vn",
  firstName: "Hai",
  lastName: "Admin",
  name: "Hai Admin",
  role: "ADMIN",
  organizationId: "org-1",
  organization: mockOrganization,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isOwner: true,
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => true,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/use-organization-queries", () => ({
  useMyOrgs: () => ({ data: [mockOrganization] }),
  useSwitchOrgMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useAllJobs: () => mockJobs,
  useApplicationStats: () => mockStats,
  useApplications: () => mockApps,
  useCandidates: () => mockCandidates,
  useInterviews: () => mockInterviews,
}));

vi.mock("@/components/layout/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJobs.data = [];
    mockJobs.isLoading = false;
    mockStats.data = {
      totalApplications: 0,
      byStage: {
        APPLIED: 0,
        SCREENING: 0,
        INTERVIEW: 0,
        OFFER: 0,
        HIRED: 0,
        REJECTED: 0,
      },
      byJob: {},
    };
    mockApps.data = { data: [] };
    mockCandidates.data = { total: 0 };
    mockInterviews.data = { data: [] };
  });

  it("renders main-content inset and StartRecruiting empty state when no jobs exist", () => {
    render(
      <DashboardFrame>
        <DashboardPage />
      </DashboardFrame>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Bắt đầu tuyển dụng")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Tạo tin tuyển dụng mới/i }),
    );
    expect(mockPush).toHaveBeenCalledWith("/jobs/new");
  });

  it("renders live dashboard metrics, pipeline, recent applications, and interviews when jobs exist", () => {
    mockJobs.data = [
      {
        id: "job-1",
        title: "Senior Frontend Engineer",
        department: "Engineering",
        location: "Ho Chi Minh",
        description: "Build HaiHire UI",
        status: "PUBLISHED",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    mockCandidates.data = { total: 14 };
    mockStats.data = {
      totalApplications: 22,
      byStage: {
        APPLIED: 5,
        SCREENING: 6,
        INTERVIEW: 4,
        OFFER: 3,
        HIRED: 2,
        REJECTED: 2,
      },
      byJob: {
        "job-1": {
          total: 22,
          byStage: {
            APPLIED: 5,
            SCREENING: 6,
            INTERVIEW: 4,
            OFFER: 3,
            HIRED: 2,
            REJECTED: 2,
          },
        },
      },
    };
    mockApps.data = {
      data: [
        {
          id: "app-1",
          candidateId: "cand-1",
          jobId: "job-1",
          candidateName: "Nguyen Van A",
          candidateEmail: "a@example.com",
          resumeUrl: "",
          resumeFileName: "",
          stage: "APPLIED",
          orderIndex: 0,
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    };

    render(
      <DashboardFrame>
        <DashboardPage />
      </DashboardFrame>,
    );

    expect(screen.getByText("TIN TUYỂN DỤNG ĐANG MỞ")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Senior Frontend Engineer" }),
    ).toHaveAttribute("href", "/jobs/job-1/pipeline");
    expect(screen.getAllByText("Senior Frontend Engineer")).toHaveLength(2);
    expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
    expect(
      screen.getByText("Không có lịch phỏng vấn nào sắp tới"),
    ).toBeInTheDocument();
  });
});
