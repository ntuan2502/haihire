import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArrowLeft } from "lucide-react";
import { StatusState } from "./status-state";

describe("StatusState component", () => {
  it("renders 403 card state with alert role and amber semantic defaults", () => {
    render(
      <StatusState
        status="403"
        variant="card"
        description="Permission denied for settings"
        actionLabel="Back to Settings"
        actionHref="/dashboard/settings"
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Permission denied for settings");

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Access Denied");

    const link = screen.getByRole("link", { name: "Back to Settings" });
    expect(link).toHaveAttribute("href", "/dashboard/settings");
  });

  it("renders 404 page state with 404 badge, h1 heading, and click + link actions", () => {
    const onBack = vi.fn();
    render(
      <StatusState
        status="404"
        variant="page"
        title="Item missing"
        description="The requested resource does not exist."
        actionLabel="Go Back"
        onAction={onBack}
        actionIcon={ArrowLeft}
        actionVariant="outline"
        secondaryAction={{
          label: "Dashboard",
          href: "/dashboard",
        }}
        testId="custom-not-found"
      />,
    );

    expect(screen.getByTestId("custom-not-found")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Item missing",
    );
    expect(
      screen.getByText("The requested resource does not exist."),
    ).toBeInTheDocument();

    const backButton = screen.getByRole("button", { name: "Go Back" });
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });
});
