import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import EmailTemplatesLayout from "./layout";

let mockPathname = "/dashboard/settings/email-templates";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

let mockCanViewEmail = true;
vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanViewEmail,
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "email.templatesTitle": "Email Templates",
        "email.templatesSubtitle": "Configure recruitment emails",
        "email.accessDenied":
          "You do not have permission to access recruitment email templates and settings.",
        "email.tabTemplates": "Templates",
        "email.tabSettings": "SMTP Settings",
        "email.tabLogs": "Logs",
      };
      return dict[key] || key;
    },
  }),
}));

describe("EmailTemplatesLayout RBAC Guard", () => {
  beforeEach(() => {
    mockCanViewEmail = true;
    mockPathname = "/dashboard/settings/email-templates";
  });

  it("blocks access and does not mount children when user lacks email:view", () => {
    mockCanViewEmail = false;

    render(
      <EmailTemplatesLayout>
        <div data-testid="email-child-content">Protected Templates</div>
      </EmailTemplatesLayout>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "You do not have permission to access recruitment email templates and settings.",
    );
    expect(screen.queryByTestId("email-child-content")).not.toBeInTheDocument();
  });

  it("renders navigation tabs and children when user has email:view", () => {
    mockCanViewEmail = true;

    render(
      <EmailTemplatesLayout>
        <div data-testid="email-child-content">Protected Templates</div>
      </EmailTemplatesLayout>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("email-child-content")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
  });
});
