import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import EmailTemplatesLayout from "./layout";

let mockPathname = "/settings/email-templates";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

let mockCanViewEmail = true;
vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanViewEmail,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: { organization: { name: "Acme" } } }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "email.templatesTitle": "Email Templates",
        "settings.tabs.emailTemplatesScope": "Shared email delivery for Acme",
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
    mockPathname = "/settings/email-templates";
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
      "You do not have permission to access this section. Please contact your administrator if you need access.",
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
    expect(screen.getByRole("link", { name: "Templates" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByText("Shared email delivery for Acme"),
    ).toBeInTheDocument();
  });
});
