import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { ThemeProvider } from "@/components/providers";
import { ThemeToggle } from "./theme-toggle";

type MediaListener = (event: MediaQueryListEvent) => void;

function installMatchMediaMock(initialDark: boolean) {
  let isDark = initialDark;
  const listeners = new Set<MediaListener>();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return query === "(prefers-color-scheme: dark)" ? isDark : false;
      },
      media: query,
      onchange: null,
      addListener: (cb: MediaListener) => listeners.add(cb),
      removeListener: (cb: MediaListener) => listeners.delete(cb),
      addEventListener: (_: string, cb: MediaListener) => listeners.add(cb),
      removeEventListener: (_: string, cb: MediaListener) =>
        listeners.delete(cb),
      dispatchEvent: vi.fn(),
    })),
  });

  return {
    setSystemDark(nextDark: boolean) {
      isDark = nextDark;
      const event = {
        matches: nextDark,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

describe("ThemeToggle with system ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
  });

  it("applies dark class on default system theme when OS prefers dark", async () => {
    installMatchMediaMock(true);

    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("switches from explicit light back to system and follows OS dark mode", async () => {
    localStorage.setItem("theme", "light");
    const media = installMatchMediaMock(true);

    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    const trigger = await screen.findByRole("button", {
      name: /chuyển đổi giao diện|toggle theme/i,
    });
    fireEvent.click(trigger);

    const systemOption = await screen.findByRole("menuitem", {
      name: /hệ thống|system/i,
    });
    fireEvent.click(systemOption);

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("system");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(document.documentElement.style.colorScheme).toBe("dark");

    act(() => {
      media.setSystemDark(false);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe("light");
    });
  });
});
