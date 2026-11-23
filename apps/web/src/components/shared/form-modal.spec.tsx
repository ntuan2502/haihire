import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormModal } from "./form-modal";

vi.mock("@/i18n/optional", () => ({
  useOptionalI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    isReady: true,
    t: (key: string) => key,
  }),
}));

describe("FormModal component", () => {
  it("renders title, description, badge, children, and default action buttons", () => {
    render(
      <FormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        title="Schedule Interview"
        description="Configure time and interviewers"
        badge={<span>Step 1</span>}
      >
        <input aria-label="Candidate note" />
      </FormModal>,
    );

    expect(screen.getByText("Schedule Interview")).toBeInTheDocument();
    expect(
      screen.getByText("Configure time and interviewers"),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Candidate note")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.cancel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.save" }),
    ).toBeInTheDocument();
  });

  it("submits the form via the primary button and prevents closing while isSubmitting is true", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <FormModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        title="Create Webhook"
        submitLabel="Create"
      >
        <div>Body</div>
      </FormModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <FormModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        title="Create Webhook"
        submitLabel="Create"
        isSubmitting={true}
      >
        <div>Body</div>
      </FormModal>,
    );

    const cancelBtn = screen.getByRole("button", { name: "common.cancel" });
    const submitBtn = screen.getByRole("button", { name: "common.saving" });
    expect(cancelBtn).toBeDisabled();
    expect(submitBtn).toBeDisabled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.submit(submitBtn.closest("form")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("renders inline alert banner when error prop is set and disables submit when submitDisabled is true", () => {
    const onSubmit = vi.fn();
    render(
      <FormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        title="Send Offer"
        error="Failed to save offer"
        submitDisabled={true}
      >
        <div>Offer fields</div>
      </FormModal>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Failed to save offer");

    const submitBtn = screen.getByRole("button", { name: "common.save" });
    expect(submitBtn).toBeDisabled();
    fireEvent.click(submitBtn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes on Escape or Cancel click when idle and supports emerald variant + footerLeft", () => {
    const onClose = vi.fn();
    render(
      <FormModal
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        title="Approve"
        submitVariant="emerald"
        submitLabel="Confirm"
        footerLeft={<span>Helper note</span>}
      >
        <div>Content</div>
      </FormModal>,
    );

    expect(screen.getByText("Helper note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass(
      "bg-emerald-600",
    );

    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
