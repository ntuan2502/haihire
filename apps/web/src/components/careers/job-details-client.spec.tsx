import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobDetailsClient } from "./job-details-client";
import type { Job, Organization } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: vi.fn(),
  }),
  SUPPORTED_LOCALES: {
    en: { name: "English", flag: "🇺🇸" },
    vi: { name: "Tiếng Việt", flag: "🇻🇳" },
  },
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useCreateApplicationMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/lib/api", () => ({
  sourcingApi: {
    trackClick: vi.fn(),
  },
}));

describe("JobDetailsClient Accessibility", () => {
  const mockJob: Job = {
    id: "job-1",
    organizationId: "org-1",
    title: "Senior Full-Stack Engineer",
    slug: "senior-full-stack-engineer",
    department: "Engineering",
    location: "Hanoi",
    workplaceType: "HYBRID",
    employmentType: "FULL_TIME",
    status: "PUBLISHED",
    description: "Build high performance applications.",
    requirements: "TypeScript, React, Node.js",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOrg: Organization = {
    id: "org-1",
    name: "HaiHire Tech",
    slug: "haihire-tech",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("renders keyboard-accessible resume file input and associated label dropzone", () => {
    const { container } = render(
      <JobDetailsClient
        initialJob={mockJob}
        initialOrg={mockOrg}
        orgSlug="haihire-tech"
        jobSlug="senior-full-stack-engineer"
      />,
    );

    const fileInput = screen.getByLabelText(
      "careers.resume",
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.tagName).toBe("INPUT");
    expect(fileInput.type).toBe("file");
    expect(fileInput).toHaveClass("sr-only");

    const dropzoneLabel = container.querySelector(
      `label[for="${fileInput.id}"]`,
    );
    expect(dropzoneLabel).toBeInTheDocument();

    fileInput.focus();
    expect(document.activeElement).toBe(fileInput);
  });

  it("allows selecting a file and renders accessible remove button", () => {
    render(
      <JobDetailsClient
        initialJob={mockJob}
        initialOrg={mockOrg}
        orgSlug="haihire-tech"
        jobSlug="senior-full-stack-engineer"
      />,
    );

    const fileInput = screen.getByLabelText(
      "careers.resume",
    ) as HTMLInputElement;
    const file = new File(["test content"], "resume.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("resume.pdf")).toBeInTheDocument();

    const removeBtn = screen.getByLabelText("common.delete");
    expect(removeBtn).toBeInTheDocument();
    expect(removeBtn.tagName).toBe("BUTTON");

    fireEvent.click(removeBtn);
    expect(screen.queryByText("resume.pdf")).not.toBeInTheDocument();
  });
});
