import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Save } from "lucide-react";
import { SettingsButton } from "./settings-button";

describe("SettingsButton component", () => {
  it("renders semantic default button without legacy bg-blue-600 override", () => {
    render(<SettingsButton icon={Save}>Save Settings</SettingsButton>);

    const button = screen.getByRole("button", { name: "Save Settings" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).not.toContain("bg-blue-600");
  });

  it("disables button, sets aria-busy, and renders spinning icon when pending", () => {
    render(
      <SettingsButton icon={Save} pending>
        Saving
      </SettingsButton>,
    );

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();
  });
});
