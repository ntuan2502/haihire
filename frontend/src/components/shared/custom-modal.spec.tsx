import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomModal } from "./custom-modal";

describe("CustomModal Component", () => {
  it("renders title, description, badge, and children", () => {
    const handleClose = vi.fn();
    render(
      <CustomModal
        isOpen={true}
        onClose={handleClose}
        title="Test Modal Title"
        description="Test modal description"
        badge={<span data-testid="test-badge">Badge</span>}
      >
        <div data-testid="modal-content">Content Body</div>
      </CustomModal>
    );

    expect(screen.getByText("Test Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Test modal description")).toBeInTheDocument();
    expect(screen.getByTestId("test-badge")).toBeInTheDocument();
    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
  });

  it("calls onClose when clicking close button or pressing Escape", () => {
    const handleClose = vi.fn();
    render(
      <CustomModal isOpen={true} onClose={handleClose} title="Escapable Modal">
        <div>Content</div>
      </CustomModal>
    );

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("supports maximize button and render-prop children", () => {
    render(
      <CustomModal
        isOpen={true}
        onClose={vi.fn()}
        title="Maximizable Modal"
        allowMaximize={true}
      >
        {({ isMaximized }) => (
          <div data-testid="is-maximized">{isMaximized ? "MAX" : "NORMAL"}</div>
        )}
      </CustomModal>
    );

    expect(screen.getByTestId("is-maximized").textContent).toBe("NORMAL");

    const maxBtn = screen.getByRole("button", { name: "Maximize" });
    fireEvent.click(maxBtn);

    expect(screen.getByTestId("is-maximized").textContent).toBe("MAX");
  });
});
