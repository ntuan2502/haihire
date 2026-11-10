import { useCallback, type KeyboardEvent } from "react";

export interface UseKeyboardClickOptions {
  onActivate: () => void;
  preventDefault?: boolean;
}

export function useKeyboardClick<T = Element>({
  onActivate,
  preventDefault = true,
}: UseKeyboardClickOptions) {
  return useCallback(
    (e: KeyboardEvent<T>) => {
      if (e.key === "Enter" || e.key === " ") {
        if (preventDefault) {
          e.preventDefault();
        }
        onActivate();
      }
    },
    [onActivate, preventDefault],
  );
}
