import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailModal } from "./detail-modal";

vi.mock("@/i18n/optional", () => ({
  useOptionalI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    isReady: true,
    t: (key: string) => key,
  }),
}));

describe("DetailModal component", () => {
  it("renders title, description, badge, headerActions, footer, and children inside dialog", () => {
    render(
      <DetailModal
        isOpen={true}
        onClose={vi.fn()}
        title="Interview Details"
        description="Scheduled technical screen"
        badge={<span>UPCOMING</span>}
        headerActions={<button type="button">Reschedule</button>}
        footer={<button type="button">Done</button>}
      >
        <div data-testid="detail-body">Candidate overview body</div>
      </DetailModal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Interview Details")).toBeInTheDocument();
    expect(screen.getByText("Scheduled technical screen")).toBeInTheDocument();
    expect(screen.getByText("UPCOMING")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reschedule" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByTestId("detail-body")).toBeInTheDocument();
  });

  it("calls onClose on close button click and Escape keydown", () => {
    const onClose = vi.fn();
    render(
      <DetailModal isOpen={true} onClose={onClose} title="Closable Detail">
        <div>Body</div>
      </DetailModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "common.close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("disables close button and blocks Escape when disableClose is true, and hides close button when showCloseButton is false", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <DetailModal
        isOpen={true}
        onClose={onClose}
        title="Locked Detail"
        disableClose={true}
      >
        <div>Body</div>
      </DetailModal>,
    );

    const closeBtn = screen.getByRole("button", { name: "common.close" });
    expect(closeBtn).toBeDisabled();
    fireEvent.click(closeBtn);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <DetailModal
        isOpen={true}
        onClose={onClose}
        title="Hidden Close Detail"
        showCloseButton={false}
      >
        <div>Body</div>
      </DetailModal>,
    );

    expect(
      screen.queryByRole("button", { name: "common.close" }),
    ).not.toBeInTheDocument();
  });

  it("applies size width class and omits aria-describedby when description is omitted", () => {
    render(
      <DetailModal
        isOpen={true}
        onClose={vi.fn()}
        title="Wide Detail"
        size="xl"
      >
        <div>Wide body</div>
      </DetailModal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("sm:max-w-4xl");
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });
});
