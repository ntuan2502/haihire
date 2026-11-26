import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

  it("filters options via search input when searchable is true and shows emptyText on no match", () => {
    const handleChange = vi.fn();
    const timezoneLikeOptions = [
      {
        value: "Asia/Ho_Chi_Minh",
        label: "(UTC+07:00) Ho Chi Minh City — Asia/Ho_Chi_Minh",
      },
      { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo — Asia/Tokyo" },
      {
        value: "America/New_York",
        label: "(UTC-05:00) New York — America/New_York",
      },
    ];

    render(
      <CustomSelect
        id="tz-select"
        value="Asia/Ho_Chi_Minh"
        onChange={handleChange}
        options={timezoneLikeOptions}
        searchable
        searchPlaceholder="Search timezone..."
        emptyText="No timezone match"
        aria-label="Timezone selection"
      />,
    );

    const trigger = screen.getByRole("button", { name: /timezone selection/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText("Search timezone...");
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "tokyo" } });
    const filtered = screen.getAllByRole("option");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toHaveTextContent("Asia/Tokyo");

    fireEvent.click(filtered[0]);
    expect(handleChange).toHaveBeenCalledWith("Asia/Tokyo");

    fireEvent.click(trigger);
    const secondSearch = screen.getByPlaceholderText("Search timezone...");
    fireEvent.change(secondSearch, { target: { value: "Atlantis" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No timezone match")).toBeInTheDocument();
  });

  it("closes only CustomSelect on Escape without closing enclosing Radix Dialog", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <CustomSelect
            id="modal-select"
            value="opt1"
            onChange={vi.fn()}
            options={options}
            aria-label="Modal selection"
          />
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole("button", { name: /modal selection/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("selects a portaled option inside Radix Dialog without triggering outside-dismiss", () => {
    const onOpenChange = vi.fn();
    const handleChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <CustomSelect
            id="modal-select-click"
            value="opt1"
            onChange={handleChange}
            options={options}
            aria-label="Modal click selection"
          />
        </DialogContent>
      </Dialog>,
    );

    expect(document.body.style.pointerEvents).toBe("none");

    fireEvent.click(
      screen.getByRole("button", { name: /modal click selection/i }),
    );
    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveStyle({ pointerEvents: "auto" });

    const opt2 = screen.getByRole("option", { name: "Option 2" });
    fireEvent.pointerDown(opt2);
    fireEvent.mouseDown(opt2);
    fireEvent.click(opt2);

    expect(handleChange).toHaveBeenCalledWith("opt2");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("allows focusing and typing in searchable CustomSelect inside modal Radix Dialog", () => {
    const onOpenChange = vi.fn();
    const handleChange = vi.fn();
    const timezoneOptions = [
      { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh" },
      { value: "Asia/Tokyo", label: "Tokyo" },
    ];

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Searchable Select</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <CustomSelect
            id="modal-searchable-select"
            value="Asia/Ho_Chi_Minh"
            onChange={handleChange}
            options={timezoneOptions}
            searchable
            searchPlaceholder="Search timezone..."
            aria-label="Timezone in modal"
          />
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: /timezone in modal/i }));

    const searchInput = screen.getByPlaceholderText("Search timezone...");
    expect(document.activeElement).toBe(searchInput);

    fireEvent.change(searchInput, { target: { value: "tokyo" } });
    fireEvent.click(screen.getByRole("option", { name: "Tokyo" }));

    expect(handleChange).toHaveBeenCalledWith("Asia/Tokyo");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("allows selecting options inside Radix Sheet with pointer-events enabled", () => {
    const onOpenChange = vi.fn();
    const handleChange = vi.fn();

    render(
      <Sheet open={true} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetHeader>
          <CustomSelect
            id="sheet-select-click"
            value="opt1"
            onChange={handleChange}
            options={options}
            aria-label="Sheet click selection"
          />
        </SheetContent>
      </Sheet>,
    );

    expect(document.body.style.pointerEvents).toBe("none");

    fireEvent.click(
      screen.getByRole("button", { name: /sheet click selection/i }),
    );
    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveStyle({ pointerEvents: "auto" });

    fireEvent.click(screen.getByRole("option", { name: "Option 2" }));
    expect(handleChange).toHaveBeenCalledWith("opt2");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("renders group headers once per group without affecting option count or selection", () => {
    const handleChange = vi.fn();
    const groupedOptions = [
      { value: "g1-a", label: "Group 1 A", group: "Primary" },
      { value: "g1-b", label: "Group 1 B", group: "Primary" },
      { value: "g2-a", label: "Group 2 A", group: "Secondary" },
    ];

    render(
      <CustomSelect
        id="grouped-select"
        value="g1-a"
        onChange={handleChange}
        options={groupedOptions}
        aria-label="Grouped selection"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /grouped selection/i }));

    expect(screen.getAllByText("Primary")).toHaveLength(1);
    expect(screen.getAllByText("Secondary")).toHaveLength(1);
    expect(screen.getAllByRole("option")).toHaveLength(3);

    fireEvent.click(screen.getByRole("option", { name: "Group 2 A" }));
    expect(handleChange).toHaveBeenCalledWith("g2-a");
  });
});
