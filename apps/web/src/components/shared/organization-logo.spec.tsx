import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizationLogo } from "./organization-logo";

vi.mock("@/lib/api/client", () => ({
  resolveOrganizationLogoUrl: (url?: string | null) =>
    url ? (url.startsWith("/api/") ? url : `/api${url}`) : null,
}));

describe("OrganizationLogo", () => {
  it("renders organization image with resolved URL when logoUrl is provided", () => {
    render(
      <OrganizationLogo
        name="HaiHire Corp"
        logoUrl="/organizations/public/org-1/logo?v=123"
      />,
    );

    const img = screen.getByRole("img", { name: "HaiHire Corp" });
    expect(img).toHaveAttribute(
      "src",
      "/api/organizations/public/org-1/logo?v=123",
    );
  });

  it("marks image decorative when decorative is true", () => {
    const { container } = render(
      <OrganizationLogo
        name="HaiHire Corp"
        logoUrl="/organizations/public/org-1/logo?v=123"
        decorative
      />,
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("falls back to initials on image error and recovers when logoUrl changes", () => {
    const { rerender, container } = render(
      <OrganizationLogo
        name="HaiHire Corp"
        logoUrl="/organizations/public/org-1/logo?v=1"
      />,
    );

    const img = screen.getByRole("img", { name: "HaiHire Corp" });
    fireEvent.error(img);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("HC");

    rerender(
      <OrganizationLogo
        name="HaiHire Corp"
        logoUrl="/organizations/public/org-1/logo?v=2"
      />,
    );

    const nextImg = screen.getByRole("img", { name: "HaiHire Corp" });
    expect(nextImg).toHaveAttribute(
      "src",
      "/api/organizations/public/org-1/logo?v=2",
    );
  });
});
