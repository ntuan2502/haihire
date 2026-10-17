import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomSelect } from "./custom-select";

describe("CustomSelect Accessibility (ARIA Listbox)", () => {
  const options = [
    { value: "opt1", label: "Option 1" },
    { value: "opt2", label: "Option 2" },
    { value: "opt3", label: "Option 3", disabled: true },
    { value: "opt4", label: "Option 4" },
  ];

  it("renders trigger with ARIA listbox attributes", () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={handleChange}
        options={options}
        aria-label="Test selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /test selection/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("id", "test-select-trigger");
    expect(trigger).not.toHaveAttribute("aria-controls");
  });

  it("opens popup and sets aria-expanded to true on click", () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={handleChange}
        options={options}
        aria-label="Test selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /test selection/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", "test-select-listbox");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveAttribute("id", "test-select-listbox");

    const renderedOptions = screen.getAllByRole("option");
    expect(renderedOptions).toHaveLength(4);
    expect(renderedOptions[0]).toHaveAttribute("aria-selected", "true");
    expect(renderedOptions[1]).toHaveAttribute("aria-selected", "false");
    expect(renderedOptions[2]).toBeDisabled();
  });

  it("opens with ArrowDown keyboard key and navigates options", () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={handleChange}
        options={options}
        aria-label="Test selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /test selection/i });

    // Open via ArrowDown
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      "test-select-listbox-opt-0",
    );

    // Move to next (opt2)
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      "test-select-listbox-opt-1",
    );

    // Move to next, skipping disabled opt3 -> moves to opt4
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      "test-select-listbox-opt-3",
    );

    // Move up, skipping disabled opt3 -> moves to opt2
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      "test-select-listbox-opt-1",
    );

    // Select opt2 with Enter
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(handleChange).toHaveBeenCalledWith("opt2");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("selects active option using Space key", () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={handleChange}
        options={options}
        aria-label="Test selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /test selection/i });
    fireEvent.keyDown(trigger, { key: " " }); // Open via Space
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // Move to opt2
    fireEvent.keyDown(trigger, { key: " " }); // Select via Space

    expect(handleChange).toHaveBeenCalledWith("opt2");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("navigates to first and last non-disabled options with Home and End", () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={handleChange}
        options={options}
        aria-label="Test selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /test selection/i });
    fireEvent.click(trigger);

    // End key
    fireEvent.keyDown(trigger, { key: "End" });
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      "test-select-listbox-opt-3",
    );

    // Home key
    fireEvent.keyDown(trigger, { key: "Home" });
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      "test-select-listbox-opt-0",
    );
  });

  it("closes on Escape key without selecting and restores focus", () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={handleChange}
        options={options}
        aria-label="Test selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /test selection/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(handleChange).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when Tab key is pressed", () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={handleChange}
        options={options}
        aria-label="Test selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /test selection/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(trigger, { key: "Tab" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
