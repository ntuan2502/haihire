import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDestructiveModal } from "./confirm-destructive-modal";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params?.matchText) {
        return `Confirm by typing: ${params.matchText}`;
      }
      return key;
    },
  }),
}));

describe("ConfirmDestructiveModal component", () => {
  it("renders title, description and disables confirm button until match text is typed", () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDestructiveModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="applications.deleteCandidateHeading"
        description="applications.deleteCandidateWarning"
        confirmMatchText="Alice Johnson"
        confirmButtonLabel="candidates.deleteCandidate"
        cancelButtonLabel="common.cancel"
      />,
    );

    expect(
      screen.getByText("applications.deleteCandidateHeading"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("applications.deleteCandidateWarning"),
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", {
      name: "candidates.deleteCandidate",
    });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Wrong Text" } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: "Alice Johnson" } });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("submits on form submit when match text matches", () => {
    const handleConfirm = vi.fn();

    render(
      <ConfirmDestructiveModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        title="interviews.cancelInterview"
        description="interviews.cancelWarning"
        confirmMatchText="CANCEL"
        confirmButtonLabel="common.confirm"
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "CANCEL" } });

    fireEvent.submit(input.closest("form")!);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("allows confirmation without typing if confirmMatchText is not provided", () => {
    const handleConfirm = vi.fn();

    render(
      <ConfirmDestructiveModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        title="applications.deleteDocumentHeading"
        description="applications.deleteDocumentWarning"
        confirmButtonLabel="common.delete"
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "common.delete" });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("prevents closing via cancel button or Escape while isLoading is true", () => {
    const handleClose = vi.fn();
    render(
      <ConfirmDestructiveModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Delete Item"
        description="Cannot cancel in flight"
        isLoading={true}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: "common.cancel" });
    expect(cancelBtn).toBeDisabled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("resets typed confirmation text when confirmMatchText target changes", () => {
    const { rerender } = render(
      <ConfirmDestructiveModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Candidate"
        description="Confirm target"
        confirmMatchText="Alice"
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Alice" } });
    expect(input).toHaveValue("Alice");

    rerender(
      <ConfirmDestructiveModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Candidate"
        description="Confirm target"
        confirmMatchText="Bob"
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("renders accessible warning contrast button and preserves DialogFooter padding", () => {
    render(
      <ConfirmDestructiveModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Close Job"
        description="Mark job closed"
        variant="warning"
        confirmButtonLabel="Confirm Close"
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: "Confirm Close" });
    expect(confirmBtn).toHaveClass("bg-amber-700");

    const footer = document.querySelector('[data-slot="dialog-footer"]');
    expect(footer).toHaveClass("pt-4");
    expect(footer).not.toHaveClass("p-0");
  });
});
