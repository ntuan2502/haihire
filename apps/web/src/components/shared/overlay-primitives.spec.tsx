import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OverlayCloseButton,
  createOverlayDismissGuard,
  hasOpenCustomSelectPopup,
  isCustomSelectInteraction,
} from "./overlay-primitives";

vi.mock("@/i18n/optional", () => ({
  useOptionalI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    isReady: true,
    t: (key: string) => key,
  }),
}));

describe("overlay-primitives", () => {
  it("detects CustomSelect popups and interactions in DOM", () => {
    expect(hasOpenCustomSelectPopup()).toBe(false);

    const popup = document.createElement("div");
    popup.setAttribute("data-custom-select-popup", "true");
    const option = document.createElement("button");
    popup.appendChild(option);
    document.body.appendChild(popup);

    expect(hasOpenCustomSelectPopup()).toBe(true);
    expect(isCustomSelectInteraction(option)).toBe(true);
    expect(isCustomSelectInteraction(document.body)).toBe(false);
    expect(isCustomSelectInteraction(null)).toBe(false);

    popup.remove();
  });

  it("blocks Escape when disableClose is true or CustomSelect popup is open, and forwards otherwise", () => {
    const onEscape = vi.fn();
    const guard = createOverlayDismissGuard({
      disableClose: false,
      onEscapeKeyDown: onEscape,
    });

    const normalEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    guard.onEscapeKeyDown?.(normalEvent);
    expect(normalEvent.defaultPrevented).toBe(false);
    expect(onEscape).toHaveBeenCalledTimes(1);

    const popup = document.createElement("div");
    popup.setAttribute("data-custom-select-popup", "true");
    document.body.appendChild(popup);

    const withPopupEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    guard.onEscapeKeyDown?.(withPopupEvent);
    expect(withPopupEvent.defaultPrevented).toBe(true);
    expect(onEscape).toHaveBeenCalledTimes(1);
    popup.remove();

    const lockedGuard = createOverlayDismissGuard({
      disableClose: true,
      onEscapeKeyDown: onEscape,
    });
    const lockedEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    lockedGuard.onEscapeKeyDown?.(lockedEvent);
    expect(lockedEvent.defaultPrevented).toBe(true);
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("renders localized 32x32 OverlayCloseButton inside DialogContent and respects disabled", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Overlay Title</DialogTitle>
            <DialogDescription>Overlay Desc</DialogDescription>
          </DialogHeader>
          <OverlayCloseButton primitive="dialog" />
        </DialogContent>
      </Dialog>,
    );

    const closeBtn = screen.getByRole("button", { name: "common.close" });
    expect(closeBtn).toHaveAttribute("data-size", "icon-sm");
    expect(closeBtn).not.toBeDisabled();

    rerender(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Overlay Title</DialogTitle>
            <DialogDescription>Overlay Desc</DialogDescription>
          </DialogHeader>
          <OverlayCloseButton primitive="dialog" disabled={true} />
        </DialogContent>
      </Dialog>,
    );

    const lockedBtn = screen.getByRole("button", { name: "common.close" });
    expect(lockedBtn).toBeDisabled();
    fireEvent.click(lockedBtn);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
