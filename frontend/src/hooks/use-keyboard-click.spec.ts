import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { useKeyboardClick } from "./use-keyboard-click";

describe("useKeyboardClick hook", () => {
  it("triggers onActivate on Enter key and calls preventDefault", () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() => useKeyboardClick({ onActivate }));

    const preventDefault = vi.fn();
    const event = {
      key: "Enter",
      preventDefault,
    } as unknown as KeyboardEvent;

    result.current(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("triggers onActivate on Space key and calls preventDefault", () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() => useKeyboardClick({ onActivate }));

    const preventDefault = vi.fn();
    const event = {
      key: " ",
      preventDefault,
    } as unknown as KeyboardEvent;

    result.current(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onActivate on other keys", () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() => useKeyboardClick({ onActivate }));

    const preventDefault = vi.fn();
    const event = {
      key: "Tab",
      preventDefault,
    } as unknown as KeyboardEvent;

    result.current(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("does not call preventDefault when preventDefault is set to false", () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardClick({ onActivate, preventDefault: false }),
    );

    const preventDefault = vi.fn();
    const event = {
      key: "Enter",
      preventDefault,
    } as unknown as KeyboardEvent;

    result.current(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
