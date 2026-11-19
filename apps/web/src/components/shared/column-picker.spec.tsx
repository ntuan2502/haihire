import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColumnPicker } from "./column-picker";

function openDropdown(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);
}

describe("ColumnPicker component", () => {
  const columns = [
    { key: "email", label: "Email", checked: true },
    { key: "stage", label: "Stage", checked: false },
    { key: "name", label: "Name", checked: true, disabled: true },
  ];

  it("opens menu, displays columns, and toggles checked items without closing menu", () => {
    const onToggle = vi.fn();
    render(
      <ColumnPicker
        columns={columns}
        onToggle={onToggle}
        label="Columns"
        menuTitle="Visible Columns"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Columns" });
    openDropdown(trigger);

    expect(screen.getByText("Visible Columns")).toBeInTheDocument();
    const stageItem = screen.getByRole("menuitemcheckbox", { name: "Stage" });
    const emailItem = screen.getByRole("menuitemcheckbox", { name: "Email" });

    expect(emailItem).toHaveAttribute("aria-checked", "true");
    expect(stageItem).toHaveAttribute("aria-checked", "false");

    fireEvent.click(stageItem);
    expect(onToggle).toHaveBeenCalledWith("stage");
    // Menu stays open due to onSelect preventDefault so multiple columns can be toggled
    expect(screen.getByText("Visible Columns")).toBeInTheDocument();
  });

  it("ignores clicks on disabled column items", () => {
    const onToggle = vi.fn();
    render(
      <ColumnPicker
        columns={columns}
        onToggle={onToggle}
        label="Columns"
        menuTitle="Visible Columns"
      />,
    );

    openDropdown(screen.getByRole("button", { name: "Columns" }));
    const disabledItem = screen.getByRole("menuitemcheckbox", { name: "Name" });
    expect(disabledItem).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(disabledItem);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
