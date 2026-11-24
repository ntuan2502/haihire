import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Users, Mail, Plug } from "lucide-react";
import { SettingsSubTabs } from "./settings-sub-tabs";

describe("SettingsSubTabs", () => {
  it("renders navigation links with aria-current and optional count badges in link mode", () => {
    render(
      <SettingsSubTabs
        ariaLabel="Members navigation"
        items={[
          {
            href: "/settings/members",
            label: "Members",
            icon: Users,
            count: 4,
            isActive: true,
          },
          {
            href: "/settings/members/invitations",
            label: "Email Invites",
            icon: Mail,
            count: 0,
            isActive: false,
          },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Members navigation" });
    expect(nav).toBeInTheDocument();

    const activeLink = screen.getByRole("link", { name: /Members/ });
    expect(activeLink).toHaveAttribute("href", "/settings/members");
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(activeLink).toHaveTextContent("4");

    const inactiveLink = screen.getByRole("link", { name: /Email Invites/ });
    expect(inactiveLink).toHaveAttribute(
      "href",
      "/settings/members/invitations",
    );
    expect(inactiveLink).not.toHaveAttribute("aria-current");
    expect(inactiveLink).toHaveTextContent("0");
  });

  it("renders tablist buttons with aria-selected and invokes onClick in button mode", () => {
    const onWebhooksClick = vi.fn();
    const onLogsClick = vi.fn();

    render(
      <SettingsSubTabs
        ariaLabel="Integrations"
        items={[
          {
            id: "webhooks",
            label: "Webhooks",
            icon: Plug,
            isActive: true,
            onClick: onWebhooksClick,
          },
          {
            id: "logs",
            label: "Logs",
            icon: Mail,
            isActive: false,
            onClick: onLogsClick,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("tablist", { name: "Integrations" }),
    ).toBeInTheDocument();

    const webhooksTab = screen.getByRole("tab", { name: "Webhooks" });
    const logsTab = screen.getByRole("tab", { name: "Logs" });
    expect(webhooksTab).toHaveAttribute("aria-selected", "true");
    expect(logsTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(logsTab);
    expect(onLogsClick).toHaveBeenCalledTimes(1);
    expect(onWebhooksClick).not.toHaveBeenCalled();
  });
});
