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
      />
    );

    expect(screen.getByText("applications.deleteCandidateHeading")).toBeInTheDocument();
    expect(screen.getByText("applications.deleteCandidateWarning")).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "candidates.deleteCandidate" });
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
      />
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
      />
    );

    const confirmButton = screen.getByRole("button", { name: "common.delete" });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
