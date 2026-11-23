import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterDrawer, FilterPillGroup } from "./filter-drawer";

vi.mock("@/i18n/optional", () => ({
  useOptionalI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    isReady: true,
    t: (key: string) => key,
  }),
}));

describe("FilterDrawer & FilterPillGroup components", () => {
  it("renders title, description, Reset and Done buttons without a misleading Cancel button", () => {
    render(
      <FilterDrawer
        isOpen={true}
        onClose={vi.fn()}
        title="Filter Candidates"
        description="Narrow down matching candidates"
        onReset={vi.fn()}
      >
        <div>Filter controls</div>
      </FilterDrawer>,
    );

    expect(screen.getByText("Filter Candidates")).toBeInTheDocument();
    expect(
      screen.getByText("Narrow down matching candidates"),
    ).toBeInTheDocument();
    expect(screen.getByText("Filter controls")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "jobs.resetAll" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "jobs.done" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancel/i }),
    ).not.toBeInTheDocument();
  });

  it("disables Reset when no filters are active and triggers onReset / onClose", () => {
    const onReset = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <FilterDrawer
        isOpen={true}
        onClose={onClose}
        title="Filter Jobs"
        hasActiveFilters={false}
        onReset={onReset}
      >
        <div />
      </FilterDrawer>,
    );

    const resetBtn = screen.getByRole("button", { name: "jobs.resetAll" });
    expect(resetBtn).toBeDisabled();

    rerender(
      <FilterDrawer
        isOpen={true}
        onClose={onClose}
        title="Filter Jobs"
        hasActiveFilters={true}
        onReset={onReset}
      >
        <div />
      </FilterDrawer>,
    );

    expect(resetBtn).not.toBeDisabled();
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "jobs.done" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders FilterPillGroup options with aria-pressed state and toggles selection", () => {
    const onToggle = vi.fn();
    render(
      <FilterPillGroup
        label="Status"
        options={[
          { value: "OPEN", label: "Open" },
          { value: "DRAFT", label: "Draft" },
        ]}
        selected={["OPEN"]}
        onToggle={onToggle}
      />,
    );

    const openBtn = screen.getByRole("button", { name: "Open" });
    const draftBtn = screen.getByRole("button", { name: "Draft" });

    expect(openBtn).toHaveAttribute("aria-pressed", "true");
    expect(draftBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(draftBtn);
    expect(onToggle).toHaveBeenCalledWith("DRAFT");
  });
});
