import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SettingsLayout from "./layout";

describe("SettingsLayout", () => {
  it("renders single-column settings content without a secondary sidebar or nested main landmark", () => {
    render(
      <SettingsLayout>
        <div data-testid="child-panel">Panel Content</div>
      </SettingsLayout>,
    );

    const shell = screen.getByTestId("settings-shell");
    const content = screen.getByTestId("settings-content");

    expect(shell.className).toContain("bg-background");
    expect(screen.queryByTestId("settings-sidebar")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("settings-sidebar-nav"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("main")).not.toBeInTheDocument();

    expect(content.className).toContain("max-w-6xl");
    expect(content).toContainElement(screen.getByTestId("child-panel"));
  });
});
