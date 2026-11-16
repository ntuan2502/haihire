import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Settings } from "lucide-react";
import { PageHeader } from "./page-header";

describe("PageHeader component", () => {
  it("renders title, icon box, subtitle, badge, actions, and optional divider", () => {
    const { container } = render(
      <PageHeader
        title="Workspace Settings"
        subtitle="Manage your organization configuration"
        badge="Admin"
        icon={Settings}
        bordered
        actions={<button type="button">Save Changes</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Workspace Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manage your organization configuration"),
    ).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("border-b");
  });

  it("renders clean header without divider or icon when optional props are omitted", () => {
    const { container } = render(<PageHeader title="Simple Page" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Simple Page" }),
    ).toBeInTheDocument();

    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain("border-b");
  });
});
